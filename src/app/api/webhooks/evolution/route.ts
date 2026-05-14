import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { jidToPhone } from "@/lib/evolution-api"
import type { EvolutionMessageData } from "@/types/chat"

/**
 * POST /api/webhooks/evolution
 *
 * Recebe eventos da Evolution API:
 * - MESSAGES_UPSERT     → nova mensagem recebida
 * - MESSAGES_UPDATE      → atualização de status (delivered/read)
 * - CONNECTION_UPDATE    → mudança de conexão
 * - QRCODE_UPDATED       → novo QR code gerado
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event        = body.event as string
    const instanceName = body.instance as string

    if (!event || !instanceName) {
      return NextResponse.json({ error: "Missing event or instance" }, { status: 400 })
    }

    // Busca a instância pelo nome para obter tenant_id
    const { data: instance } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id, tenant_id")
      .eq("instance_name", instanceName)
      .single()

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    switch (event) {
      case "messages.upsert":
      case "MESSAGES_UPSERT":
        await handleMessageUpsert(instance.id, instance.tenant_id, body.data)
        break

      case "messages.update":
      case "MESSAGES_UPDATE":
        await handleMessageUpdate(body.data)
        break

      case "connection.update":
      case "CONNECTION_UPDATE":
        await handleConnectionUpdate(instance.id, body.data)
        break

      case "qrcode.updated":
      case "QRCODE_UPDATED":
        // QR code updates are polled from the frontend, no action needed here
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[Webhook Evolution]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// ── Handlers ────────────────────────────────────────────────

async function handleMessageUpsert(
  instanceId: string,
  tenantId:   string,
  data:       EvolutionMessageData | EvolutionMessageData[],
) {
  const messages = Array.isArray(data) ? data : [data]

  for (const msg of messages) {
    if (!msg.key?.remoteJid) continue

    // Ignora grupos e broadcasts
    const jid = msg.key.remoteJid
    if (jid.includes("@g.us") || jid === "status@broadcast") continue

    // fromMe = mensagem enviada pelo número conectado (agente)
    // Não processamos mensagens enviadas por nós mesmos via webhook
    // (elas já são salvas quando o agente envia pela interface)
    if (msg.key.fromMe) {
      // Apenas atualiza o whatsapp_msg_id se a mensagem já existe no DB
      if (msg.key.id) {
        await supabaseAdmin
          .from("chat_messages")
          .update({ whatsapp_msg_id: msg.key.id, status: "sent" })
          .eq("tenant_id", tenantId)
          .is("whatsapp_msg_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
      }
      continue
    }

    const phone    = jidToPhone(jid)
    const pushName = msg.pushName ?? null

    // Extrai conteúdo da mensagem
    const { contentType, content, mediaUrl, mediaMimeType, mediaFileName } = extractMessageContent(msg)

    // 1. Busca ou cria contato
    const contact = await findOrCreateContact(tenantId, jid, phone, pushName)

    // 2. Busca ou cria conversa
    const conversation = await findOrCreateConversation(tenantId, contact.id, instanceId)

    // 3. Insere mensagem
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conversation.id,
      tenant_id:       tenantId,
      sender_type:     "contact",
      sender_id:       contact.id,
      content_type:    contentType,
      content,
      media_url:       mediaUrl,
      media_mime_type: mediaMimeType,
      media_file_name: mediaFileName,
      whatsapp_msg_id: msg.key.id ?? null,
      status:          "delivered",
      is_private_note: false,
    })

    // 4. Atualiza conversa com preview e contadores
    const preview = content
      ? content.substring(0, 100)
      : `📎 ${contentType}`

    await supabaseAdmin
      .from("chat_conversations")
      .update({
        last_message_at:      new Date().toISOString(),
        last_message_preview: preview,
        unread_count:         (conversation.unread_count ?? 0) + 1,
        status:               conversation.status === "resolved" ? "open" : conversation.status,
        updated_at:           new Date().toISOString(),
      })
      .eq("id", conversation.id)
  }
}

async function handleMessageUpdate(data: unknown) {
  const updates = Array.isArray(data) ? data : [data]

  for (const update of updates) {
    const u = update as { key?: { id?: string }; status?: string }
    if (!u.key?.id || !u.status) continue

    const statusMap: Record<string, string> = {
      DELIVERY_ACK: "delivered",
      READ:         "read",
      PLAYED:       "read",
    }

    const newStatus = statusMap[u.status]
    if (newStatus) {
      await supabaseAdmin
        .from("chat_messages")
        .update({ status: newStatus })
        .eq("whatsapp_msg_id", u.key.id)
    }
  }
}

async function handleConnectionUpdate(instanceId: string, data: unknown) {
  const d = data as { state?: string }
  if (!d.state) return

  const statusMap: Record<string, string> = {
    open:       "connected",
    close:      "disconnected",
    connecting: "connecting",
  }

  const newStatus = statusMap[d.state] ?? "disconnected"

  await supabaseAdmin
    .from("whatsapp_instances")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", instanceId)
}

// ── Helpers ─────────────────────────────────────────────────

function extractMessageContent(msg: EvolutionMessageData) {
  const m = msg.message
  if (!m) return { contentType: "text" as const, content: null, mediaUrl: null, mediaMimeType: null, mediaFileName: null }

  if (m.conversation) {
    return { contentType: "text" as const, content: m.conversation, mediaUrl: null, mediaMimeType: null, mediaFileName: null }
  }
  if (m.extendedTextMessage?.text) {
    return { contentType: "text" as const, content: m.extendedTextMessage.text, mediaUrl: null, mediaMimeType: null, mediaFileName: null }
  }
  if (m.imageMessage) {
    return { contentType: "image" as const, content: m.imageMessage.caption ?? null, mediaUrl: m.imageMessage.url ?? null, mediaMimeType: m.imageMessage.mimetype ?? null, mediaFileName: null }
  }
  if (m.audioMessage) {
    return { contentType: "audio" as const, content: null, mediaUrl: m.audioMessage.url ?? null, mediaMimeType: m.audioMessage.mimetype ?? null, mediaFileName: null }
  }
  if (m.videoMessage) {
    return { contentType: "video" as const, content: m.videoMessage.caption ?? null, mediaUrl: m.videoMessage.url ?? null, mediaMimeType: m.videoMessage.mimetype ?? null, mediaFileName: null }
  }
  if (m.documentMessage) {
    return { contentType: "document" as const, content: m.documentMessage.caption ?? null, mediaUrl: m.documentMessage.url ?? null, mediaMimeType: m.documentMessage.mimetype ?? null, mediaFileName: m.documentMessage.fileName ?? null }
  }
  if (m.stickerMessage) {
    return { contentType: "sticker" as const, content: null, mediaUrl: null, mediaMimeType: m.stickerMessage.mimetype ?? null, mediaFileName: null }
  }
  if (m.locationMessage) {
    return { contentType: "location" as const, content: `${m.locationMessage.degreesLatitude},${m.locationMessage.degreesLongitude}`, mediaUrl: null, mediaMimeType: null, mediaFileName: null }
  }
  if (m.reactionMessage) {
    return { contentType: "reaction" as const, content: m.reactionMessage.text, mediaUrl: null, mediaMimeType: null, mediaFileName: null }
  }

  return { contentType: "text" as const, content: msg.messageType ?? null, mediaUrl: null, mediaMimeType: null, mediaFileName: null }
}

async function findOrCreateContact(
  tenantId:  string,
  jid:       string,
  phone:     string,
  pushName:  string | null,
) {
  // Tenta buscar contato existente
  const { data: existing } = await supabaseAdmin
    .from("chat_contacts")
    .select("id, customer_id")
    .eq("tenant_id", tenantId)
    .eq("whatsapp_id", jid)
    .single()

  if (existing) {
    // Atualiza push_name se mudou
    if (pushName) {
      await supabaseAdmin
        .from("chat_contacts")
        .update({ push_name: pushName, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing
  }

  // Tenta vincular a um customer pelo campo comprador_whatsapp
  let customerId: string | null = null
  const phoneDigits = phone.replace(/\D/g, "")
  // Tenta match com diferentes formatos do telefone
  const phoneSuffixes = [phoneDigits, phoneDigits.slice(-11), phoneDigits.slice(-10)]

  for (const suffix of phoneSuffixes) {
    if (!suffix) continue
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("comprador_whatsapp", `%${suffix}`)
      .limit(1)
      .single()

    if (customer) {
      customerId = customer.id
      break
    }
  }

  // Cria novo contato
  const { data: newContact, error } = await supabaseAdmin
    .from("chat_contacts")
    .insert({
      tenant_id:    tenantId,
      customer_id:  customerId,
      whatsapp_id:  jid,
      phone_number: phone,
      push_name:    pushName,
    })
    .select("id, customer_id")
    .single()

  if (error || !newContact) throw new Error(`Failed to create contact: ${error?.message}`)
  return newContact
}

async function findOrCreateConversation(
  tenantId:   string,
  contactId:  string,
  instanceId: string,
) {
  // Busca conversa aberta ou pendente com este contato
  const { data: existing } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, status, unread_count")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .in("status", ["open", "pending", "snoozed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing

  // Cria nova conversa
  const { data: newConv, error } = await supabaseAdmin
    .from("chat_conversations")
    .insert({
      tenant_id:    tenantId,
      contact_id:   contactId,
      instance_id:  instanceId,
      status:       "open",
      unread_count: 0,
    })
    .select("id, status, unread_count")
    .single()

  if (error || !newConv) throw new Error(`Failed to create conversation: ${error?.message}`)
  return newConv
}
