import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { jidToPhone, getMediaBase64, fetchProfilePictureUrl, fetchGroupMetadata } from "@/lib/evolution-api"
import type { EvolutionMessageData } from "@/types/chat"

const CHAT_BUCKET = "chat-attachments"

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg":  "jpg",
  "image/png":   "png",
  "image/webp":  "webp",
  "image/gif":   "gif",
  "audio/ogg":   "ogg",
  "audio/mpeg":  "mp3",
  "audio/mp4":   "m4a",
  "audio/webm":  "webm",
  "video/mp4":   "mp4",
  "video/webm":  "webm",
  "application/pdf": "pdf",
}

/**
 * Baixa mídia da Evolution (descriptografada do WhatsApp) e armazena no nosso bucket.
 * Retorna o storage_path e signed URL recém-gerada.
 */
async function downloadAndStoreMedia(
  instance: { id: string; tenant_id: string; evolution_url: string; evolution_key: string; instance_name: string },
  conversationId: string,
  msg: EvolutionMessageData,
  contentType: "image" | "audio" | "video" | "document",
  knownFileName: string | null,
): Promise<{ storagePath: string; signedUrl: string; mimeType: string | null } | { error: string }> {
  try {
    const config = {
      url:          instance.evolution_url,
      apiKey:       instance.evolution_key,
      instanceName: instance.instance_name,
    }

    console.log("[webhook] downloadAndStoreMedia start", {
      conversationId,
      contentType,
      msgKey: msg.key,
      evolution: instance.evolution_url,
    })

    let result: { base64?: string; mimetype?: string; fileName?: string }
    try {
      result = await getMediaBase64(config, msg)
    } catch (evoErr) {
      const errMsg = `evolution_api_error: ${(evoErr as Error).message}`
      console.error("[webhook]", errMsg)
      return { error: errMsg }
    }

    if (!result?.base64) {
      const errMsg = `no_base64_in_response: ${JSON.stringify(result).slice(0, 200)}`
      console.error("[webhook]", errMsg)
      return { error: errMsg }
    }

    // Normaliza mime type — WhatsApp pode enviar "audio/ogg; codecs=opus"
    // Storage do Supabase só aceita o mime base sem parâmetros
    const rawMime  = result.mimetype ?? null
    const mimeType = rawMime ? rawMime.split(";")[0].trim() : null
    const ext      = (mimeType && MIME_EXTENSIONS[mimeType]) ?? "bin"
    const baseName = knownFileName ?? result.fileName ?? `${contentType}_${Date.now()}.${ext}`
    const safe     = baseName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const storagePath = `${instance.tenant_id}/${conversationId}/${Date.now()}_${safe}`

    const buffer = Buffer.from(result.base64, "base64")

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(CHAT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType ?? "application/octet-stream",
        upsert: false,
      })

    if (uploadErr) {
      const errMsg = `storage_upload_error: ${uploadErr.message}`
      console.error("[webhook]", errMsg)
      return { error: errMsg }
    }

    const { data: signed } = await supabaseAdmin.storage
      .from(CHAT_BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (!signed?.signedUrl) {
      return { error: "signed_url_failed" }
    }

    return { storagePath, signedUrl: signed.signedUrl, mimeType }
  } catch (err) {
    const errMsg = `unexpected: ${(err as Error).message}`
    console.error("[webhook]", errMsg, err)
    return { error: errMsg }
  }
}

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

    // Busca a instância pelo nome (com creds da Evolution pra baixar mídias)
    const { data: instance } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id, tenant_id, evolution_url, evolution_key, instance_name")
      .eq("instance_name", instanceName)
      .single()

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    switch (event) {
      case "messages.upsert":
      case "MESSAGES_UPSERT":
        await handleMessageUpsert(instance, body.data)
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
  instance: { id: string; tenant_id: string; evolution_url: string; evolution_key: string; instance_name: string },
  data:     EvolutionMessageData | EvolutionMessageData[],
) {
  const instanceId = instance.id
  const tenantId   = instance.tenant_id
  const messages = Array.isArray(data) ? data : [data]

  for (const msg of messages) {
    if (!msg.key?.remoteJid) continue

    const jid = msg.key.remoteJid

    // Ignora broadcasts sempre (não há decisão razoável)
    if (jid === "status@broadcast") continue

    // ── Grupo: aplica lógica de opt-in ──────────────────────
    const isGroup = jid.includes("@g.us")
    if (isGroup) {
      const decision = await resolveGroupOptIn(instance, jid, msg)
      if (decision === "ignore" || decision === "pending") continue
      // decision === "monitor" → segue o fluxo abaixo, mas com lógica de grupo
    }

    // fromMe = mensagem enviada pelo número conectado (agente)
    if (msg.key.fromMe) {
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

    const pushName = msg.pushName ?? null
    const { contentType, content, mediaMimeType, mediaFileName } = extractMessageContent(msg)
    const externalAdReply = extractExternalAdReply(msg)

    let contact:      { id: string; customer_id?: string | null } | null = null
    let conversation: { id: string; status: string; unread_count: number }
    let participantJid: string | null = null

    if (isGroup) {
      // Grupo: contato = sender dentro do grupo (msg.key.participant), conversa = grupo
      participantJid = (msg.key as any).participant ?? null
      const memberPhone = participantJid ? jidToPhone(participantJid) : ""
      if (participantJid && memberPhone) {
        contact = await findOrCreateContact(tenantId, participantJid, memberPhone, pushName, instance)
      }
      conversation = await findOrCreateGroupConversation(tenantId, instanceId, jid, pushName)
    } else {
      // 1-1: contato = remetente, conversa = 1-1
      const phone = jidToPhone(jid)
      contact = await findOrCreateContact(tenantId, jid, phone, pushName, instance)
      conversation = await findOrCreateConversation(tenantId, contact.id, instanceId)
    }

    // 3. Se for mídia, baixa da Evolution e armazena no nosso bucket
    let finalMediaUrl: string | null = null
    let finalMimeType: string | null = mediaMimeType
    const metadata: Record<string, unknown> = {}

    if (externalAdReply) {
      metadata.external_ad_reply = externalAdReply
    }

    const isMedia = contentType === "image" || contentType === "audio" || contentType === "video" || contentType === "document"
    if (isMedia) {
      const stored = await downloadAndStoreMedia(instance, conversation.id, msg, contentType, mediaFileName)
      if ("error" in stored) {
        // Falhou — registra o erro no metadata pra debug + mantém URL original (criptografada)
        metadata.media_error          = stored.error
        metadata.media_error_at       = new Date().toISOString()
        metadata.original_whatsapp_url = (msg.message as any)?.imageMessage?.url
                                       ?? (msg.message as any)?.audioMessage?.url
                                       ?? (msg.message as any)?.videoMessage?.url
                                       ?? (msg.message as any)?.documentMessage?.url
                                       ?? null
      } else {
        finalMediaUrl  = stored.signedUrl
        finalMimeType  = stored.mimeType ?? mediaMimeType
        metadata.storage_path = stored.storagePath
      }
    }

    // 4. Insere mensagem
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id:       conversation.id,
      tenant_id:             tenantId,
      sender_type:           "contact",
      sender_id:             contact?.id ?? null,
      content_type:          contentType,
      content,
      media_url:             finalMediaUrl,
      media_mime_type:       finalMimeType,
      media_file_name:       mediaFileName,
      whatsapp_msg_id:       msg.key.id ?? null,
      status:                "delivered",
      is_private_note:       false,
      metadata:              Object.keys(metadata).length > 0 ? metadata : {},
      group_participant_jid: isGroup ? participantJid : null,
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
  const now       = new Date().toISOString()

  const update: Record<string, unknown> = {
    status:            newStatus,
    last_heartbeat_at: now,
    updated_at:        now,
  }
  // Quando reconecta com sucesso, zera flags de erro
  if (newStatus === "connected") {
    update.reconnect_attempts = 0
    update.last_error         = null
  }

  await supabaseAdmin
    .from("whatsapp_instances")
    .update(update)
    .eq("id", instanceId)
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Procura `contextInfo.externalAdReply` em qualquer tipo de mensagem.
 * Existe quando o lead entrou via Click-to-WhatsApp Ad da Meta.
 */
function extractExternalAdReply(msg: EvolutionMessageData) {
  const m = msg.message
  if (!m) return null
  const ctx =
    m.extendedTextMessage?.contextInfo ??
    m.imageMessage?.contextInfo ??
    m.videoMessage?.contextInfo ??
    m.audioMessage?.contextInfo ??
    m.documentMessage?.contextInfo ??
    m.stickerMessage?.contextInfo ??
    m.locationMessage?.contextInfo ??
    null
  return ctx?.externalAdReply ?? null
}

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
  instance?: { evolution_url: string; evolution_key: string; instance_name: string },
) {
  // Tenta buscar contato existente
  const { data: existing } = await supabaseAdmin
    .from("chat_contacts")
    .select("id, customer_id, profile_pic_url")
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
    // Se o contato ainda não tem foto, tenta puxar em background
    if (!existing.profile_pic_url && instance) {
      fetchAndSaveProfilePicture(instance, jid, existing.id).catch(() => {})
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

  // Em background, tenta puxar a foto de perfil do WhatsApp do novo contato
  if (instance) {
    fetchAndSaveProfilePicture(instance, jid, newContact.id).catch(() => {})
  }

  return newContact
}

/**
 * Busca a URL da foto de perfil do WhatsApp e grava em chat_contacts.profile_pic_url.
 * Fire-and-forget — falhas silenciosas (foto privada, número novo, etc).
 */
async function fetchAndSaveProfilePicture(
  instance:  { evolution_url: string; evolution_key: string; instance_name: string },
  jid:       string,
  contactId: string,
) {
  const url = await fetchProfilePictureUrl(
    {
      url:          instance.evolution_url,
      apiKey:       instance.evolution_key,
      instanceName: instance.instance_name,
    },
    jid,
  )
  if (!url) return
  await supabaseAdmin
    .from("chat_contacts")
    .update({ profile_pic_url: url, updated_at: new Date().toISOString() })
    .eq("id", contactId)
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

  // Atribui ao pipeline default no estágio de Triagem (NÃO no funil real)
  // Lead só entra no funil quando atendente clica "Qualificar".
  let pipelineId: string | null = null
  let stageId:    string | null = null

  const { data: marketingConfig } = await supabaseAdmin
    .from("tenant_marketing_config")
    .select("default_pipeline_id")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (marketingConfig?.default_pipeline_id) {
    pipelineId = marketingConfig.default_pipeline_id

    // Tenta encontrar o estágio de Triagem do pipeline
    const { data: triageStage } = await supabaseAdmin
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .eq("is_triage", true)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (triageStage) {
      stageId = triageStage.id
    } else {
      // Se não existe Triagem ainda (pipeline antigo), cria automaticamente
      const { data: newTriage } = await supabaseAdmin
        .from("pipeline_stages")
        .insert({
          tenant_id:      tenantId,
          pipeline_id:    pipelineId,
          name:           "Triagem",
          color:          "#94a3b8",
          position:       -1,
          is_triage:      true,
          is_won:         false,
          is_lost:        false,
          show_in_kanban: false,
        })
        .select("id")
        .single()
      stageId = newTriage?.id ?? null
    }
  }

  // Cria nova conversa já no pipeline
  const { data: newConv, error } = await supabaseAdmin
    .from("chat_conversations")
    .insert({
      tenant_id:     tenantId,
      contact_id:    contactId,
      instance_id:   instanceId,
      status:        "open",
      unread_count:  0,
      pipeline_id:   pipelineId,
      stage_id:      stageId,
      card_position: 0,
    })
    .select("id, status, unread_count")
    .single()

  if (error || !newConv) throw new Error(`Failed to create conversation: ${error?.message}`)
  return newConv
}

// ── Grupos: opt-in ─────────────────────────────────────────

/**
 * Resolve a decisão sobre um grupo: monitor / ignore / pending.
 *   - Se já existe whitelist entry: retorna o status atual
 *   - Se não existe: cria como "pending" e retorna "pending" (não processa a mensagem)
 *
 * Não bloqueia o processamento da mensagem aqui — quem decide ignorar
 * a mensagem é o caller, baseado no retorno.
 */
async function resolveGroupOptIn(
  instance: { id: string; tenant_id: string },
  groupJid: string,
  msg:      EvolutionMessageData,
): Promise<"monitor" | "ignore" | "pending"> {
  const { data: existing } = await supabaseAdmin
    .from("chat_groups_whitelist")
    .select("status")
    .eq("tenant_id", instance.tenant_id)
    .eq("group_jid", groupJid)
    .maybeSingle()

  if (existing) return existing.status as "monitor" | "ignore" | "pending"

  // Primeira vez que vemos esse grupo — cria como pending
  const subject = (msg as any)?.message?.groupSubject
              ?? (msg as any)?.subject
              ?? null

  await supabaseAdmin
    .from("chat_groups_whitelist")
    .insert({
      tenant_id:   instance.tenant_id,
      instance_id: instance.id,
      group_jid:   groupJid,
      group_name:  subject,
      status:      "pending",
    })
    .select("id")
    .maybeSingle()

  return "pending"
}

/**
 * Cria/retorna a conversa de grupo. Diferente de findOrCreateConversation:
 *   - chave de busca é group_jid (não contact_id)
 *   - is_group = true
 *   - contact_id pode ser null (não há "dono" único)
 */
async function findOrCreateGroupConversation(
  tenantId:   string,
  instanceId: string,
  groupJid:   string,
  groupName:  string | null,
) {
  const { data: existing } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, status, unread_count")
    .eq("tenant_id", tenantId)
    .eq("group_jid", groupJid)
    .eq("is_group", true)
    .in("status", ["open", "pending", "snoozed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing

  // Auto-atribui ao pipeline default (mesma lógica de 1-1)
  let pipelineId: string | null = null
  let stageId:    string | null = null

  const { data: mc } = await supabaseAdmin
    .from("tenant_marketing_config")
    .select("default_pipeline_id")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (mc?.default_pipeline_id) {
    pipelineId = mc.default_pipeline_id
    const { data: triageStage } = await supabaseAdmin
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .eq("is_triage", true)
      .limit(1)
      .maybeSingle()
    stageId = triageStage?.id ?? null
  }

  const { data: newConv, error } = await supabaseAdmin
    .from("chat_conversations")
    .insert({
      tenant_id:     tenantId,
      contact_id:    null,
      instance_id:   instanceId,
      status:        "open",
      unread_count:  0,
      pipeline_id:   pipelineId,
      stage_id:      stageId,
      card_position: 0,
      is_group:      true,
      group_jid:     groupJid,
      group_name:    groupName,
    })
    .select("id, status, unread_count")
    .single()

  if (error || !newConv) throw new Error(`Failed to create group conversation: ${error?.message}`)
  return newConv
}
