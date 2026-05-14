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

  try {
    // Tenta obter status primeiro
    const statusResult = await evo.getInstanceStatus(config)
    if (statusResult.instance?.state === "open") {
      // Já conectado
      await supabaseAdmin
        .from("whatsapp_instances")
        .update({ status: "connected", updated_at: new Date().toISOString() })
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
      .update({ status: "qr_pending", updated_at: new Date().toISOString() })
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

  try {
    const result = await evo.getInstanceStatus(config)
    const state  = result.instance?.state

    const statusMap: Record<string, string> = {
      open:       "connected",
      close:      "disconnected",
      connecting: "connecting",
    }
    const status = statusMap[state ?? "close"] ?? "disconnected"

    await supabaseAdmin
      .from("whatsapp_instances")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("tenant_id", session.user.tenantId)

    return { status }
  } catch {
    return { status: "disconnected" }
  }
}

export async function disconnectWhatsApp() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const config = await getInstanceConfig(session.user.tenantId)

  await evo.logoutInstance(config)

  await supabaseAdmin
    .from("whatsapp_instances")
    .update({ status: "disconnected", phone_number: null, updated_at: new Date().toISOString() })
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
    .select("id, contact_id, instance_id, chat_contacts(whatsapp_id, phone_number)")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

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
