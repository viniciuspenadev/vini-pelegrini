import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { InboxClient } from "@/components/chat/inbox-client"
import type { ChatConversation, ChatMessage, ChatContact, ChatQuickReply } from "@/types/chat"

export default async function MarketingInboxPage() {
  const session = await auth()
  if (!session) return null

  const tenantId = session.user.tenantId

  // 1. Busca instância WhatsApp
  const { data: instance } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .single()

  const instanceStatus = !instance ? "not_configured" : instance.status

  // Se não configurado ou desconectado, retorna early com status
  if (!instance || instance.status === "disconnected") {
    return (
      <div className="h-[calc(100vh-3.5rem)]">
        <InboxClient
          conversations={[]}
          messages={{}}
          contacts={{}}
          customers={{}}
          recentOrders={{}}
          quickReplies={[]}
          agents={[]}
          instanceStatus={instanceStatus}
        />
      </div>
    )
  }

  // 2. Busca dados em paralelo
  const [
    { data: conversationsRaw },
    { data: quickReplies },
    { data: agentsRaw },
  ] = await Promise.all([
    supabaseAdmin
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
      .limit(100),
    supabaseAdmin
      .from("chat_quick_replies")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("shortcut"),
    supabaseAdmin
      .from("tenant_users")
      .select("user_id, profiles ( full_name )")
      .eq("tenant_id", tenantId)
      .eq("active", true),
  ])

  const conversations = (conversationsRaw ?? []) as ChatConversation[]

  // 3. Busca mensagens das últimas conversas (top 20 para performance)
  const activeConvIds = conversations.slice(0, 20).map((c) => c.id)
  const { data: allMessages } = activeConvIds.length > 0
    ? await supabaseAdmin
        .from("chat_messages")
        .select("*, profiles ( full_name )")
        .in("conversation_id", activeConvIds)
        .order("created_at", { ascending: true })
        .limit(500)
    : { data: [] }

  // Renova signed URLs das mensagens que têm storage_path próprio
  const rawMessages = (allMessages ?? []) as any[]
  const pathsToSign = Array.from(new Set(
    rawMessages.map((m) => m?.metadata?.storage_path).filter(Boolean) as string[]
  ))
  const signedMap = new Map<string, string>()
  if (pathsToSign.length > 0) {
    await Promise.all(
      pathsToSign.map(async (path) => {
        const { data } = await supabaseAdmin.storage
          .from("chat-attachments")
          .createSignedUrl(path, 3600)
        if (data?.signedUrl) signedMap.set(path, data.signedUrl)
      })
    )
  }

  // Group messages by conversation (com URLs renovadas)
  const messagesByConv: Record<string, ChatMessage[]> = {}
  for (const msg of rawMessages as ChatMessage[]) {
    const path = (msg as any)?.metadata?.storage_path as string | undefined
    const fresh = path ? signedMap.get(path) : undefined
    const final = fresh ? { ...msg, media_url: fresh } : msg
    if (!messagesByConv[msg.conversation_id]) {
      messagesByConv[msg.conversation_id] = []
    }
    messagesByConv[msg.conversation_id].push(final)
  }

  // 4. Build contacts map
  const contactsMap: Record<string, ChatContact> = {}
  for (const conv of conversations) {
    if (conv.chat_contacts) {
      contactsMap[conv.contact_id] = conv.chat_contacts
    }
  }

  // 5. Busca customers vinculados
  const customerIds = Object.values(contactsMap)
    .map((c) => c.customer_id)
    .filter(Boolean) as string[]

  let customersMap: Record<string, unknown> = {}
  if (customerIds.length > 0) {
    const { data: customersRaw } = await supabaseAdmin
      .from("customers")
      .select("id, razao_social, nome_fantasia, cnpj_cpf, comprador_nome, email_financeiro, cidade, estado")
      .in("id", [...new Set(customerIds)])

    for (const c of customersRaw ?? []) {
      customersMap[c.id] = c
    }
  }

  // 6. Busca pedidos recentes por customer
  const ordersMap: Record<string, unknown[]> = {}
  if (customerIds.length > 0) {
    const { data: ordersRaw } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, estimated_total_amount, final_total_amount, created_at")
      .eq("tenant_id", tenantId)
      .in("customer_id", [...new Set(customerIds)])
      .order("created_at", { ascending: false })
      .limit(50)

    for (const o of ordersRaw ?? []) {
      // Agrupa por customer_id — precisamos do customer_id que não está no select
      // Então agrupamos pelo customer_id do contato
      for (const cid of customerIds) {
        if (!ordersMap[cid]) ordersMap[cid] = []
      }
    }

    // Fallback: query individual por customer (top 5 cada)
    for (const cid of [...new Set(customerIds)]) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, estimated_total_amount, final_total_amount, created_at")
        .eq("tenant_id", tenantId)
        .eq("customer_id", cid)
        .order("created_at", { ascending: false })
        .limit(5)
      ordersMap[cid] = data ?? []
    }
  }

  // 7. Agentes
  const agents = (agentsRaw ?? []).map((a: any) => ({
    id:        a.user_id,
    full_name: a.profiles?.full_name ?? null,
  }))

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <InboxClient
        conversations={conversations}
        messages={messagesByConv}
        contacts={contactsMap}
        customers={customersMap as any}
        recentOrders={ordersMap as any}
        quickReplies={(quickReplies ?? []) as ChatQuickReply[]}
        agents={agents}
        instanceStatus={instanceStatus}
      />
    </div>
  )
}
