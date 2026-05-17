import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { InboxClient } from "@/components/chat/inbox-client"
import type { ChatConversation, ChatMessage, ChatContact, ChatQuickReply } from "@/types/chat"
import { getSegmentConfig } from "@/lib/segments/registry"

export default async function MarketingInboxPage() {
  const session = await auth()
  if (!session) return null

  const tenantId = session.user.tenantId

  // 0. Segment do tenant — define como o ContactSidebar se comporta
  const { data: tenantRow } = await supabaseAdmin
    .from("tenants")
    .select("segment")
    .eq("id", tenantId)
    .single()
  const segmentConfig = getSegmentConfig(tenantRow?.segment ?? null)

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
          segmentConfig={segmentConfig}
        />
      </div>
    )
  }

  // 2. Busca dados em paralelo (inclui pipeline_stages + pipelines + tags)
  const [
    { data: conversationsRaw },
    { data: quickReplies },
    { data: agentsRaw },
    { data: pipelinesRaw },
    { data: stagesRaw },
    { data: tagsRaw },
    { data: taggingsRaw },
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
        profiles ( full_name ),
        pipeline_stages ( id, name, color, is_won, is_lost )
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
    supabaseAdmin
      .from("pipelines")
      .select("id, name, color, is_default")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("position"),
    supabaseAdmin
      .from("pipeline_stages")
      .select("id, pipeline_id, name, color, position, is_won, is_lost")
      .eq("tenant_id", tenantId)
      .order("position"),
    supabaseAdmin
      .from("tags")
      .select("id, name, color")
      .eq("tenant_id", tenantId)
      .order("name"),
    supabaseAdmin
      .from("taggings")
      .select("tag_id, taggable_id")
      .eq("tenant_id", tenantId)
      .eq("taggable_type", "contact"),
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

  // 4. Build contacts map (conversas de grupo não têm contact_id)
  const contactsMap: Record<string, ChatContact> = {}
  for (const conv of conversations) {
    if (conv.chat_contacts && conv.contact_id) {
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
      .select("id, razao_social, nome_fantasia, cnpj_cpf, comprador_nome, email_financeiro, telefone, cidade, estado")
      .in("id", [...new Set(customerIds)])

    for (const c of customersRaw ?? []) {
      customersMap[c.id] = c
    }
  }

  // 6. Busca pedidos recentes por customer
  const ordersMap: Record<string, unknown[]> = {}
  const financialsMap: Record<string, {
    ltv:           number
    open_orders:   number
    receivable_open:  number
    receivable_overdue: number
    on_time_rate:  number | null
  }> = {}

  if (customerIds.length > 0) {
    const uniqueCustomerIds = [...new Set(customerIds)]

    // Pedidos recentes (top 5 por cliente)
    await Promise.all(
      uniqueCustomerIds.map(async (cid) => {
        const { data } = await supabaseAdmin
          .from("orders")
          .select("id, order_number, status, estimated_total_amount, final_total_amount, created_at")
          .eq("tenant_id", tenantId)
          .eq("customer_id", cid)
          .order("created_at", { ascending: false })
          .limit(5)
        ordersMap[cid] = data ?? []
      })
    )

    // Stats financeiros — agregado em queries batch
    const [{ data: allOrdersAgg }, { data: arAgg }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("customer_id, status, final_total_amount, estimated_total_amount")
        .eq("tenant_id", tenantId)
        .in("customer_id", uniqueCustomerIds),
      supabaseAdmin
        .from("accounts_receivable")
        .select("customer_id, status, amount, paid_amount, due_date, paid_at")
        .eq("tenant_id", tenantId)
        .in("customer_id", uniqueCustomerIds),
    ])

    const todayIso = new Date().toISOString().slice(0, 10)

    for (const cid of uniqueCustomerIds) {
      const orders = (allOrdersAgg ?? []).filter((o: any) => o.customer_id === cid)
      const ars    = (arAgg ?? []).filter((a: any) => a.customer_id === cid)

      const ltv = orders
        .filter((o: any) => o.status === "delivered" || o.status === "invoiced")
        .reduce((s: number, o: any) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)

      const open_orders = orders.filter((o: any) =>
        !["delivered", "invoiced", "cancelled", "canceled"].includes(o.status)
      ).length

      let receivable_open    = 0
      let receivable_overdue = 0
      let paidOnTime         = 0
      let paidTotal          = 0

      for (const ar of ars) {
        const balance = Number(ar.amount ?? 0) - Number(ar.paid_amount ?? 0)
        if (ar.status === "aberto" || ar.status === "parcial") {
          receivable_open += balance
          if (ar.due_date && ar.due_date < todayIso) {
            receivable_overdue += balance
          }
        } else if (ar.status === "vencido") {
          receivable_open    += balance
          receivable_overdue += balance
        } else if (ar.status === "pago" && ar.paid_at && ar.due_date) {
          paidTotal += 1
          if (ar.paid_at.slice(0, 10) <= ar.due_date) paidOnTime += 1
        }
      }

      const on_time_rate = paidTotal > 0 ? paidOnTime / paidTotal : null

      financialsMap[cid] = {
        ltv,
        open_orders,
        receivable_open,
        receivable_overdue,
        on_time_rate,
      }
    }
  }

  // 7. Agentes
  const agents = (agentsRaw ?? []).map((a: any) => ({
    id:        a.user_id,
    full_name: a.profiles?.full_name ?? null,
  }))

  // 8. Mapa de tags por contato
  const tagsByContact: Record<string, string[]> = {}
  for (const t of taggingsRaw ?? []) {
    const arr = tagsByContact[(t as any).taggable_id] ?? []
    arr.push((t as any).tag_id)
    tagsByContact[(t as any).taggable_id] = arr
  }

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <InboxClient
        conversations={conversations}
        messages={messagesByConv}
        contacts={contactsMap}
        customers={customersMap as any}
        recentOrders={ordersMap as any}
        customerFinancials={financialsMap}
        quickReplies={(quickReplies ?? []) as ChatQuickReply[]}
        agents={agents}
        instanceStatus={instanceStatus}
        pipelines={(pipelinesRaw ?? []) as any}
        stages={(stagesRaw ?? []) as any}
        tags={(tagsRaw ?? []) as any}
        tagsByContact={tagsByContact}
        segmentConfig={segmentConfig}
      />
    </div>
  )
}
