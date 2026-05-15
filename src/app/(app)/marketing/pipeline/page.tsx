import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ensurePipelineBootstrap } from "@/lib/actions/pipeline"
import { ConversationKanban } from "@/components/marketing/conversation-kanban"
import { Workflow, ChevronRight, Settings } from "lucide-react"

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const { pipeline: pipelineQuery } = await searchParams
  const tenantId = session.user.tenantId

  // Bootstrap
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("segment")
    .eq("id", tenantId)
    .single()

  await ensurePipelineBootstrap(tenantId, tenant?.segment ?? null, session.user.id)

  const [{ data: pipelines }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("pipelines")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("position"),
    supabaseAdmin
      .from("profiles")
      .select("view_all_conversations")
      .eq("id", session.user.id)
      .single(),
  ])

  if (!pipelines || pipelines.length === 0) {
    return <div className="p-6">Erro inicializando pipeline.</div>
  }

  const currentPipeline = pipelineQuery
    ? pipelines.find((p) => p.id === pipelineQuery) ?? pipelines.find((p) => p.is_default) ?? pipelines[0]
    : pipelines.find((p) => p.is_default) ?? pipelines[0]

  const { data: stages } = await supabaseAdmin
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", currentPipeline.id)
    .order("position")

  // Visibilidade
  const isAdminOrOwner = ["owner", "admin"].includes(session.user.role)
  const canSeeAll      = isAdminOrOwner || (profile?.view_all_conversations ?? false)

  // Busca conversas do pipeline
  let convQuery = supabaseAdmin
    .from("chat_conversations")
    .select(`
      id, status, priority, subject,
      last_message_at, last_message_preview, unread_count,
      pipeline_id, stage_id, card_position,
      estimated_value, expected_close_date, lost_reason,
      won_at, lost_at,
      assigned_to,
      chat_contacts (
        id, push_name, phone_number, profile_pic_url,
        customers ( id, razao_social, nome_fantasia )
      ),
      profiles ( full_name, email )
    `)
    .eq("tenant_id", tenantId)
    .eq("pipeline_id", currentPipeline.id)
    .order("card_position", { ascending: true })

  if (!canSeeAll) convQuery = convQuery.eq("assigned_to", session.user.id)

  const { data: conversations } = await convQuery

  // Count de pedidos por customer (pra mostrar LTV)
  const customerIds = (conversations ?? [])
    .map((c: any) => c.chat_contacts?.customers?.id)
    .filter(Boolean)

  const orderStatsByCustomer: Record<string, { count: number; total: number }> = {}
  if (customerIds.length > 0) {
    const { data: orderStats } = await supabaseAdmin
      .from("orders")
      .select("customer_id, final_total_amount, estimated_total_amount")
      .in("customer_id", customerIds as string[])
      .eq("tenant_id", tenantId)
      .neq("status", "cancelado")

    for (const o of orderStats ?? []) {
      const key = o.customer_id as string
      if (!orderStatsByCustomer[key]) orderStatsByCustomer[key] = { count: 0, total: 0 }
      orderStatsByCustomer[key].count++
      orderStatsByCustomer[key].total += Number(o.final_total_amount ?? o.estimated_total_amount ?? 0)
    }
  }

  return (
    <div className="min-h-full bg-blue-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Workflow className="size-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span>Marketing</span>
              <ChevronRight className="size-3" />
              <span className="text-slate-600 font-medium">Pipeline</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{currentPipeline.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {(conversations ?? []).length} {(conversations ?? []).length === 1 ? "conversa" : "conversas"} ·
              {" "}{!canSeeAll ? "vendo apenas minhas" : "visão completa"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pills de funil */}
          {pipelines.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              {pipelines.map((p) => (
                <a
                  key={p.id}
                  href={`/marketing/pipeline?pipeline=${p.id}`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    p.id === currentPipeline.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {p.name}
                </a>
              ))}
            </div>
          )}

          {isAdminOrOwner && (
            <Link
              href="/marketing/pipeline/configuracao"
              title="Configurar funis"
              className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <Settings className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="p-4">
        <ConversationKanban
          stages={(stages ?? []) as any}
          conversations={(conversations ?? []) as any}
          orderStats={orderStatsByCustomer}
        />
      </div>
    </div>
  )
}
