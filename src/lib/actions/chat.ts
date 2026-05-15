"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import * as evo from "@/lib/evolution-api"

// ── Helpers ─────────────────────────────────────────────────

async function getInstanceConfig(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("*")
    .eq("tenant_id", tenantId)
    .single()

  if (!data) throw new Error("WhatsApp não configurado. Acesse Marketing → Configuração.")

  return {
    url:          data.evolution_url,
    apiKey:       data.evolution_key,
    instanceName: data.instance_name,
  }
}

// ── Configuração ────────────────────────────────────────────

export async function saveWhatsAppConfig(formData: {
  evolution_url:   string
  evolution_key:   string
  instance_name:   string
  webhook_url?:    string
}) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  if (!["owner", "admin"].includes(session.user.role)) throw new Error("Sem permissão")

  const tenantId = session.user.tenantId

  // Upsert — cria ou atualiza
  const { data: existing } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("id")
    .eq("tenant_id", tenantId)
    .single()

  if (existing) {
    await supabaseAdmin
      .from("whatsapp_instances")
      .update({
        evolution_url:  formData.evolution_url.replace(/\/$/, ""),
        evolution_key:  formData.evolution_key,
        instance_name:  formData.instance_name,
        webhook_url:    formData.webhook_url || null,
        updated_at:     new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await supabaseAdmin
      .from("whatsapp_instances")
      .insert({
        tenant_id:      tenantId,
        evolution_url:  formData.evolution_url.replace(/\/$/, ""),
        evolution_key:  formData.evolution_key,
        instance_name:  formData.instance_name,
        webhook_url:    formData.webhook_url || null,
        status:         "disconnected",
      })
  }

  revalidatePath("/marketing/configuracao")
  return { success: true }
}

export async function connectWhatsApp() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const config = await getInstanceConfig(session.user.tenantId)
  const now    = new Date().toISOString()

  try {
    // Tenta obter status primeiro
    const statusResult = await evo.getInstanceStatus(config)
    if (statusResult.instance?.state === "open") {
      // Já conectado — reset flags de saúde
      await supabaseAdmin
        .from("whatsapp_instances")
        .update({
          status:             "connected",
          user_disconnected:  false,
          reconnect_attempts: 0,
          last_heartbeat_at:  now,
          last_error:         null,
          updated_at:         now,
        })
        .eq("tenant_id", session.user.tenantId)

      return { status: "connected" as const, qrCode: null }
    }
  } catch {
    // Se a instância não existe na Evolution API, tenta criar
    try {
      await evo.createInstance(config)
    } catch {
      // Ignora se já existe
    }
  }

  // Obtém QR Code
  try {
    const qr = await evo.getQrCode(config)

    await supabaseAdmin
      .from("whatsapp_instances")
      .update({
        status:             "qr_pending",
        user_disconnected:  false,
        reconnect_attempts: 0,
        last_heartbeat_at:  now,
        last_error:         null,
        updated_at:         now,
      })
      .eq("tenant_id", session.user.tenantId)

    return {
      status: "qr_pending" as const,
      qrCode: qr.base64 ?? null,
      pairingCode: qr.pairingCode ?? null,
    }
  } catch (err) {
    throw new Error(`Erro ao gerar QR Code: ${(err as Error).message}`)
  }
}

export async function checkConnectionStatus() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const config = await getInstanceConfig(session.user.tenantId)
  const now    = new Date().toISOString()

  try {
    const result = await evo.getInstanceStatus(config)
    const state  = result.instance?.state

    const statusMap: Record<string, string> = {
      open:       "connected",
      close:      "disconnected",
      connecting: "connecting",
    }
    const status = statusMap[state ?? "close"] ?? "disconnected"

    const update: Record<string, unknown> = {
      status,
      last_heartbeat_at: now,
      updated_at:        now,
    }
    if (status === "connected") {
      update.reconnect_attempts = 0
      update.last_error         = null
    }

    await supabaseAdmin
      .from("whatsapp_instances")
      .update(update)
      .eq("tenant_id", session.user.tenantId)

    return { status }
  } catch (err) {
    await supabaseAdmin
      .from("whatsapp_instances")
      .update({
        last_heartbeat_at: now,
        last_error:        `Health check falhou: ${(err as Error).message}`,
        updated_at:        now,
      })
      .eq("tenant_id", session.user.tenantId)

    return { status: "disconnected" }
  }
}

export async function disconnectWhatsApp() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const config = await getInstanceConfig(session.user.tenantId)

  await evo.logoutInstance(config)

  const now = new Date().toISOString()
  await supabaseAdmin
    .from("whatsapp_instances")
    .update({
      status:             "disconnected",
      phone_number:       null,
      user_disconnected:  true,            // cron não vai tentar reconectar
      reconnect_attempts: 0,
      last_heartbeat_at:  now,
      last_error:         null,
      updated_at:         now,
    })
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing/configuracao")
  return { success: true }
}

export async function configureWebhook(webhookUrl: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const config = await getInstanceConfig(session.user.tenantId)
  await evo.setWebhook(config, webhookUrl)

  await supabaseAdmin
    .from("whatsapp_instances")
    .update({ webhook_url: webhookUrl, updated_at: new Date().toISOString() })
    .eq("tenant_id", session.user.tenantId)

  return { success: true }
}

// ── Mensagens ───────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  content:        string,
  isPrivateNote?: boolean,
) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const tenantId = session.user.tenantId

  // Busca conversa e contato
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, contact_id, instance_id, assigned_to, participants, chat_contacts(whatsapp_id, phone_number)")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

  // Permissão de envio: owner/admin, assigned_to ou participante
  const isAdmin       = ["owner", "admin"].includes(session.user.role)
  const isAssigned    = (conv as any).assigned_to === session.user.id
  const isParticipant = ((conv as any).participants ?? []).includes(session.user.id)
  if (!isAdmin && !isAssigned && !isParticipant) {
    throw new Error("Sem permissão para responder nesta conversa. Peça para o atendente atribuído te adicionar como participante.")
  }

  const contact = conv.chat_contacts as unknown as { whatsapp_id: string; phone_number: string }

  // Insere no banco primeiro
  const { data: msg, error } = await supabaseAdmin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      tenant_id:       tenantId,
      sender_type:     "agent",
      sender_id:       session.user.id,
      content_type:    "text",
      content,
      status:          isPrivateNote ? "delivered" : "pending",
      is_private_note: isPrivateNote ?? false,
    })
    .select("id")
    .single()

  if (error || !msg) throw new Error(error?.message ?? "Erro ao salvar mensagem")

  // Se não é nota privada, envia via Evolution API
  if (!isPrivateNote) {
    try {
      const config = await getInstanceConfig(tenantId)
      const result = await evo.sendTextMessage(config, contact.phone_number, content)

      // Atualiza com o ID do WhatsApp
      await supabaseAdmin
        .from("chat_messages")
        .update({ whatsapp_msg_id: result.key?.id ?? null, status: "sent" })
        .eq("id", msg.id)
    } catch (err) {
      // Marca como failed
      await supabaseAdmin
        .from("chat_messages")
        .update({ status: "failed" })
        .eq("id", msg.id)
      throw new Error(`Erro ao enviar: ${(err as Error).message}`)
    }
  }

  // Atualiza preview da conversa
  await supabaseAdmin
    .from("chat_conversations")
    .update({
      last_message_at:     new Date().toISOString(),
      last_message_preview: content.substring(0, 100),
      updated_at:          new Date().toISOString(),
    })
    .eq("id", conversationId)

  revalidatePath("/marketing")
  return { id: msg.id }
}

// ── Envio de mídia ──────────────────────────────────────────

const CHAT_BUCKET = "chat-attachments"

function detectMediaType(mime: string): "image" | "audio" | "video" | "document" {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("video/")) return "video"
  return "document"
}

export async function sendChatMedia(conversationId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")

  const file    = formData.get("file") as File | null
  const caption = (formData.get("caption") as string) || ""
  if (!file || file.size === 0) throw new Error("Nenhum arquivo")

  const tenantId  = session.user.tenantId
  const mediaType = detectMediaType(file.type)

  // Busca conversa + contato
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, contact_id, assigned_to, participants, chat_contacts(phone_number)")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

  const isAdmin       = ["owner", "admin"].includes(session.user.role)
  const isAssigned    = (conv as any).assigned_to === session.user.id
  const isParticipant = ((conv as any).participants ?? []).includes(session.user.id)
  if (!isAdmin && !isAssigned && !isParticipant) {
    throw new Error("Sem permissão para enviar mídia nesta conversa.")
  }

  const contact = conv.chat_contacts as unknown as { phone_number: string }

  // Upload pra Storage privado
  const safeName    = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const storagePath = `${tenantId}/${conversationId}/${Date.now()}_${safeName}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(CHAT_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })
  if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`)

  // Gera URL assinada (60 minutos — suficiente para Evolution baixar)
  const { data: signed, error: urlErr } = await supabaseAdmin.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(storagePath, 3600)
  if (urlErr || !signed) {
    await supabaseAdmin.storage.from(CHAT_BUCKET).remove([storagePath])
    throw new Error("Erro ao gerar URL")
  }

  // Insere a mensagem como "pending"
  const { data: msg, error: dbErr } = await supabaseAdmin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      tenant_id:       tenantId,
      sender_type:     "agent",
      sender_id:       session.user.id,
      content_type:    mediaType,
      content:         caption || null,
      media_url:       signed.signedUrl,
      media_mime_type: file.type,
      media_file_name: file.name,
      status:          "pending",
      is_private_note: false,
      metadata:        { storage_path: storagePath },
    })
    .select("id")
    .single()

  if (dbErr || !msg) {
    await supabaseAdmin.storage.from(CHAT_BUCKET).remove([storagePath])
    throw new Error(dbErr?.message ?? "Erro ao salvar")
  }

  // Envia via Evolution
  try {
    const config = await getInstanceConfig(tenantId)
    const result = await evo.sendMediaMessage(
      config,
      contact.phone_number,
      signed.signedUrl,
      mediaType,
      caption || undefined,
      file.name,
    )

    await supabaseAdmin
      .from("chat_messages")
      .update({ whatsapp_msg_id: result.key?.id ?? null, status: "sent" })
      .eq("id", msg.id)
  } catch (err) {
    await supabaseAdmin
      .from("chat_messages")
      .update({ status: "failed" })
      .eq("id", msg.id)
    throw new Error(`Falha no envio: ${(err as Error).message}`)
  }

  // Preview
  const previewLabels: Record<string, string> = {
    image: "📷 Imagem", audio: "🎤 Áudio", video: "📹 Vídeo", document: "📎 Documento",
  }
  await supabaseAdmin
    .from("chat_conversations")
    .update({
      last_message_at:      new Date().toISOString(),
      last_message_preview: caption || previewLabels[mediaType] || "Mídia",
      updated_at:           new Date().toISOString(),
    })
    .eq("id", conversationId)

  revalidatePath("/marketing")
  return { id: msg.id }
}

// ── Gerenciamento de conversas ──────────────────────────────

export async function assignConversation(conversationId: string, agentId: string | null) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_conversations")
    .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing")
}

export async function updateConversationStatus(conversationId: string, status: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Ao resolver, zera unread
  if (status === "resolved") {
    updates.unread_count = 0
  }

  await supabaseAdmin
    .from("chat_conversations")
    .update(updates)
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing")
}

export async function markConversationRead(conversationId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)
}

// ── Criar conversa manual ───────────────────────────────────

function normalizePhone(input: string): { phone: string; jid: string } | null {
  const digits = input.replace(/\D/g, "")
  if (digits.length < 10) return null
  // BR: garante DDI 55 (se vier sem)
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`
  return { phone: withCountry, jid: `${withCountry}@s.whatsapp.net` }
}

export async function searchContactsAndCustomers(query: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const tenantId = session.user.tenantId
  const q        = query.trim()
  if (q.length < 2) return { contacts: [], customers: [] }

  const [{ data: contacts }, { data: customers }] = await Promise.all([
    supabaseAdmin
      .from("chat_contacts")
      .select("id, phone_number, push_name, customer_id, customers ( razao_social, nome_fantasia )")
      .eq("tenant_id", tenantId)
      .or(`push_name.ilike.%${q}%,phone_number.ilike.%${q}%`)
      .limit(8),
    supabaseAdmin
      .from("customers")
      .select("id, razao_social, nome_fantasia, comprador_nome, comprador_whatsapp, cnpj_cpf")
      .eq("tenant_id", tenantId)
      .or(`razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%,comprador_nome.ilike.%${q}%,cnpj_cpf.ilike.%${q}%,comprador_whatsapp.ilike.%${q}%`)
      .limit(8),
  ])

  return {
    contacts:  contacts  ?? [],
    customers: customers ?? [],
  }
}

export async function createManualConversation(input: {
  phone?:        string
  contactId?:    string
  customerId?:   string
  pushName?:     string
}) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const tenantId = session.user.tenantId

  // 1. Pega instância WhatsApp
  const { data: instance } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("id")
    .eq("tenant_id", tenantId)
    .single()
  if (!instance) throw new Error("WhatsApp não configurado.")

  // 2. Resolve contact_id
  let contactId    = input.contactId ?? null
  let customerLink = input.customerId ?? null

  if (!contactId) {
    // Tenta achar pelo telefone — se customer foi passado, tenta extrair do customer
    let rawPhone = input.phone ?? ""
    if (!rawPhone && input.customerId) {
      const { data: cust } = await supabaseAdmin
        .from("customers")
        .select("comprador_whatsapp")
        .eq("id", input.customerId)
        .eq("tenant_id", tenantId)
        .single()
      rawPhone = cust?.comprador_whatsapp ?? ""
    }

    const norm = normalizePhone(rawPhone)
    if (!norm) throw new Error("Telefone inválido. Use DDD + número (ex: 11999998888)")

    // Tenta achar contato existente pelo whatsapp_id
    const { data: existing } = await supabaseAdmin
      .from("chat_contacts")
      .select("id, customer_id")
      .eq("tenant_id", tenantId)
      .eq("whatsapp_id", norm.jid)
      .maybeSingle()

    if (existing) {
      contactId    = existing.id
      customerLink = customerLink ?? existing.customer_id
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("chat_contacts")
        .insert({
          tenant_id:    tenantId,
          whatsapp_id:  norm.jid,
          phone_number: norm.phone,
          push_name:    input.pushName ?? null,
          customer_id:  customerLink,
          tags:         [],
        })
        .select("id")
        .single()
      if (error || !created) throw new Error(`Erro criando contato: ${error?.message}`)
      contactId = created.id
    }
  }

  // 3. Verifica se já há conversa aberta com este contato
  const { data: existingConv } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .in("status", ["open", "pending", "snoozed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingConv) {
    revalidatePath("/marketing")
    return { id: existingConv.id, reused: true }
  }

  // 4. Auto-atribui ao pipeline default + primeiro estágio
  let pipelineId: string | null = null
  let stageId:    string | null = null

  const { data: mc } = await supabaseAdmin
    .from("tenant_marketing_config")
    .select("default_pipeline_id")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (mc?.default_pipeline_id) {
    pipelineId = mc.default_pipeline_id
    const { data: firstStage } = await supabaseAdmin
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle()
    stageId = firstStage?.id ?? null
  }

  // 5. Cria conversa
  const { data: newConv, error: convErr } = await supabaseAdmin
    .from("chat_conversations")
    .insert({
      tenant_id:     tenantId,
      contact_id:    contactId,
      instance_id:   instance.id,
      status:        "open",
      unread_count:  0,
      pipeline_id:   pipelineId,
      stage_id:      stageId,
      card_position: 0,
      assigned_to:   session.user.id,
    })
    .select("id")
    .single()

  if (convErr || !newConv) throw new Error(`Erro criando conversa: ${convErr?.message}`)

  // 6. Insere mensagem-sistema
  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: newConv.id,
    tenant_id:       tenantId,
    sender_type:     "system",
    content_type:    "text",
    content:         "Conversa iniciada manualmente pelo atendente.",
    status:          "delivered",
    is_private_note: false,
  })

  revalidatePath("/marketing")
  revalidatePath("/marketing/pipeline")
  return { id: newConv.id, reused: false }
}

// ── Contato: vincular cliente / bloquear / notas ────────────

export async function linkCustomerToContact(contactId: string, customerId: string | null) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_contacts")
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing")
}

export async function setContactBlocked(contactId: string, blocked: boolean) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_contacts")
    .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing")
}

export async function setContactNotes(contactId: string, notes: string | null) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_contacts")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing")
}

export async function archiveConversation(conversationId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_conversations")
    .update({
      status:       "resolved",
      unread_count: 0,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)

  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: conversationId,
    tenant_id:       session.user.tenantId,
    sender_type:     "system",
    content_type:    "text",
    content:         "Conversa arquivada.",
    status:          "delivered",
    is_private_note: false,
  })

  revalidatePath("/marketing")
  revalidatePath("/marketing/pipeline")
}

export async function searchCustomersForLink(query: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const q = query.trim()
  if (q.length < 2) return []

  const { data } = await supabaseAdmin
    .from("customers")
    .select("id, razao_social, nome_fantasia, cnpj_cpf, comprador_nome")
    .eq("tenant_id", session.user.tenantId)
    .or(`razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%,cnpj_cpf.ilike.%${q}%,comprador_nome.ilike.%${q}%`)
    .limit(8)

  return data ?? []
}

// ── Participantes da conversa (array uuid[]) ────────────────

export async function addConversationParticipant(conversationId: string, userId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const tenantId = session.user.tenantId

  // Permissão: owner/admin ou assigned_to
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("assigned_to, participants")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

  const isAdmin    = ["owner", "admin"].includes(session.user.role)
  const isAssigned = conv.assigned_to === session.user.id
  if (!isAdmin && !isAssigned) throw new Error("Apenas o atendente atribuído ou administradores podem adicionar participantes.")

  const current = (conv.participants ?? []) as string[]
  if (current.includes(userId)) return { ok: true }
  const next = [...current, userId]

  await supabaseAdmin
    .from("chat_conversations")
    .update({ participants: next, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)

  // Pega nome do agente adicionado para a mensagem-sistema
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single()

  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: conversationId,
    tenant_id:       tenantId,
    sender_type:     "system",
    content_type:    "text",
    content:         `${prof?.full_name ?? "Agente"} foi adicionado à conversa.`,
    status:          "delivered",
    is_private_note: false,
  })

  revalidatePath("/marketing")
  return { ok: true }
}

export async function removeConversationParticipant(conversationId: string, userId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const tenantId = session.user.tenantId

  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("assigned_to, participants")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

  const isAdmin    = ["owner", "admin"].includes(session.user.role)
  const isAssigned = conv.assigned_to === session.user.id
  const isSelf     = userId === session.user.id
  if (!isAdmin && !isAssigned && !isSelf) {
    throw new Error("Sem permissão para remover participantes.")
  }

  const current = (conv.participants ?? []) as string[]
  const next    = current.filter((id) => id !== userId)

  await supabaseAdmin
    .from("chat_conversations")
    .update({ participants: next, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single()

  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: conversationId,
    tenant_id:       tenantId,
    sender_type:     "system",
    content_type:    "text",
    content:         `${prof?.full_name ?? "Agente"} saiu da conversa.`,
    status:          "delivered",
    is_private_note: false,
  })

  revalidatePath("/marketing")
  return { ok: true }
}

// ── Total de não-lidas (para badge no menu) ─────────────────

export async function getUnreadTotal() {
  const session = await auth()
  if (!session) return 0

  const tenantId = session.user.tenantId
  const userId   = session.user.id
  const isAdmin  = ["owner", "admin"].includes(session.user.role)

  let query = supabaseAdmin
    .from("chat_conversations")
    .select("unread_count, assigned_to, participants")
    .eq("tenant_id", tenantId)
    .gt("unread_count", 0)
    .in("status", ["open", "pending"])

  const { data } = await query
  if (!data) return 0

  // Filtra por visibilidade do usuário
  let visible = data
  if (!isAdmin) {
    // Verifica flag view_all_conversations
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("view_all_conversations")
      .eq("id", userId)
      .single()

    if (!prof?.view_all_conversations) {
      visible = data.filter((c: any) =>
        c.assigned_to === userId ||
        (c.participants ?? []).includes(userId)
      )
    }
  }

  return visible.reduce((s: number, c: any) => s + (c.unread_count ?? 0), 0)
}

// ── Quick Replies ───────────────────────────────────────────

export async function createQuickReply(data: { shortcut: string; title: string; content: string }) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin.from("chat_quick_replies").insert({
    tenant_id:  session.user.tenantId,
    shortcut:   data.shortcut.startsWith("/") ? data.shortcut : `/${data.shortcut}`,
    title:      data.title,
    content:    data.content,
    created_by: session.user.id,
  })

  revalidatePath("/marketing/configuracao")
}

export async function deleteQuickReply(id: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  await supabaseAdmin
    .from("chat_quick_replies")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing/configuracao")
}

// ── Data Fetching (para polling do client) ──────────────────

/**
 * Renova signed URLs das mensagens com mídia armazenada no bucket próprio.
 * Mensagens com mídia recebida pela Evolution mantêm a URL original.
 */
async function refreshMediaUrls(messages: any[]): Promise<any[]> {
  const toSign = messages
    .map((m) => m?.metadata?.storage_path as string | undefined)
    .filter((p): p is string => !!p)

  if (toSign.length === 0) return messages

  // Em batch — uma URL por path (signed por 1h, suficiente p/ visualização)
  const signedMap = new Map<string, string>()
  await Promise.all(
    toSign.map(async (path) => {
      const { data } = await supabaseAdmin.storage
        .from(CHAT_BUCKET)
        .createSignedUrl(path, 3600)
      if (data?.signedUrl) signedMap.set(path, data.signedUrl)
    })
  )

  return messages.map((m) => {
    const path = m?.metadata?.storage_path as string | undefined
    if (!path) return m
    const fresh = signedMap.get(path)
    return fresh ? { ...m, media_url: fresh } : m
  })
}

export async function getMessages(conversationId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data } = await supabaseAdmin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: true })
    .limit(200)

  return await refreshMediaUrls((data ?? []) as any[])
}

export async function refreshInbox() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const tenantId = session.user.tenantId

  const { data: conversationsRaw } = await supabaseAdmin
    .from("chat_conversations")
    .select(`
      *,
      chat_contacts (
        id, tenant_id, customer_id, whatsapp_id, phone_number, push_name,
        profile_pic_url, is_blocked, tags, notes, created_at, updated_at,
        customers ( razao_social, nome_fantasia )
      ),
      profiles ( full_name )
    `)
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100)

  const conversations = conversationsRaw ?? []

  // Build contacts map
  const contacts: Record<string, unknown> = {}
  for (const conv of conversations as any[]) {
    if (conv.chat_contacts) {
      contacts[conv.contact_id] = conv.chat_contacts
    }
  }

  return { conversations, contacts } as any
}
