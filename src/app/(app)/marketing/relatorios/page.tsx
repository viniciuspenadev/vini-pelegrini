import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { requireModule } from "@/lib/modules"
import { ReportsClient } from "@/components/marketing/reports-client"
import { BarChart3 } from "lucide-react"

export const dynamic = "force-dynamic"

interface SearchParams { searchParams: Promise<{ period?: string; pipeline?: string }> }

const SLA_THRESHOLD_MINUTES = 15

export default async function MarketingReportsPage({ searchParams }: SearchParams) {
  await requireModule("marketing.relatorios")

  const session  = await auth()
  if (!session?.user?.tenantId) return null
  const tenantId = session.user.tenantId

  const sp     = await searchParams
  const period = sp.period ?? "30d"   // hoje | 7d | 30d | 90d
  const days   = period === "hoje" ? 1 : period === "7d" ? 7 : period === "90d" ? 90 : 30

  const now    = new Date()
  const since  = new Date(now.getTime() - days * 86_400_000)
  const sinceIso = since.toISOString()

  // ── Dados em paralelo ──────────────────────────────────────
  // Período anterior (pra delta de novos contatos)
  const previousSince = new Date(since.getTime() - days * 86_400_000).toISOString()

  const [
    { data: pipelines },
    { data: stages },
    { data: convs },
    { data: agentMessages },
    { data: newContacts },
    { data: prevContactsRaw },
  ] = await Promise.all([
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
      .from("chat_conversations")
      .select("id, pipeline_id, stage_id, status, estimated_value, won_at, lost_at, lost_reason, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("chat_messages")
      .select("conversation_id, sender_type, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(10000),
    supabaseAdmin
      .from("chat_contacts")
      .select("id, source, customer_id, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("chat_contacts")
      .select("id")
      .eq("tenant_id", tenantId)
      .gte("created_at", previousSince)
      .lt("created_at", sinceIso),
  ])

  // Agregação de novos contatos por origem
  const newContactsList   = newContacts ?? []
  const newContactsCount  = newContactsList.length
  const prevContactsCount = (prevContactsRaw ?? []).length

  const contactsBySource: Record<string, number> = {}
  let vinculadosCount = 0
  for (const c of newContactsList) {
    const src = (c as any).source ?? "whatsapp_inbound"
    contactsBySource[src] = (contactsBySource[src] ?? 0) + 1
    if ((c as any).customer_id) vinculadosCount++
  }

  const sourcesArray = Object.entries(contactsBySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  const vinculadoRate = newContactsCount > 0 ? vinculadosCount / newContactsCount : null

  const pipelineFilter = sp.pipeline ?? (pipelines?.find((p) => p.is_default)?.id ?? pipelines?.[0]?.id ?? null)
  const filteredConvs  = (convs ?? []).filter((c) => !pipelineFilter || c.pipeline_id === pipelineFilter)
  const filteredStages = (stages ?? []).filter((s) => !pipelineFilter || s.pipeline_id === pipelineFilter)

  // ── 1. Funil de conversão ──────────────────────────────────
  const convsByStage = new Map<string, number>()
  const valueByStage = new Map<string, number>()
  for (const c of filteredConvs) {
    if (!c.stage_id) continue
    convsByStage.set(c.stage_id, (convsByStage.get(c.stage_id) ?? 0) + 1)
    if (c.estimated_value) {
      valueByStage.set(c.stage_id, (valueByStage.get(c.stage_id) ?? 0) + Number(c.estimated_value))
    }
  }

  const funnel = filteredStages
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      stage_id:  s.id,
      name:      s.name,
      color:     s.color,
      is_won:    s.is_won,
      is_lost:   s.is_lost,
      count:     convsByStage.get(s.id) ?? 0,
      value:     valueByStage.get(s.id) ?? 0,
    }))

  // ── 2. KPIs agregados ──────────────────────────────────────
  const totalConvs   = filteredConvs.length
  const wonConvs     = filteredConvs.filter((c) => !!c.won_at)
  const lostConvs    = filteredConvs.filter((c) => !!c.lost_at)
  const wonCount     = wonConvs.length
  const lostCount    = lostConvs.length
  const decidedCount = wonCount + lostCount
  const winRate      = decidedCount > 0 ? wonCount / decidedCount : null
  const wonValue     = wonConvs.reduce((s, c) => s + Number(c.estimated_value ?? 0), 0)
  const openValue    = filteredConvs
    .filter((c) => !c.won_at && !c.lost_at && c.status !== "resolved")
    .reduce((s, c) => s + Number(c.estimated_value ?? 0), 0)

  // ── 3. Tempo de 1ª resposta + SLA ──────────────────────────
  // Pega para cada conversa: primeira mensagem do contato, primeira resposta do agente posterior
  const firstByConv = new Map<string, { firstContact?: string; firstAgent?: string }>()
  for (const m of agentMessages ?? []) {
    const ent = firstByConv.get(m.conversation_id) ?? {}
    if (m.sender_type === "contact" && !ent.firstContact) ent.firstContact = m.created_at
    if (m.sender_type === "agent"   && ent.firstContact && !ent.firstAgent) ent.firstAgent = m.created_at
    firstByConv.set(m.conversation_id, ent)
  }

  const responseTimes: number[] = []  // em segundos
  let withinSla = 0
  for (const [, ent] of firstByConv) {
    if (!ent.firstContact || !ent.firstAgent) continue
    const sec = (new Date(ent.firstAgent).getTime() - new Date(ent.firstContact).getTime()) / 1000
    if (sec <= 0) continue
    responseTimes.push(sec)
    if (sec <= SLA_THRESHOLD_MINUTES * 60) withinSla++
  }
  responseTimes.sort((a, b) => a - b)
  const avgResponseSec = responseTimes.length > 0
    ? responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length
    : null
  const medianResponseSec = responseTimes.length > 0
    ? responseTimes[Math.floor(responseTimes.length / 2)]
    : null
  const slaRate = responseTimes.length > 0 ? withinSla / responseTimes.length : null

  // ── 4. Motivos de perda (top 5) ─────────────────────────────
  const lostReasonCounts = new Map<string, number>()
  for (const c of lostConvs) {
    const r = (c.lost_reason ?? "").trim()
    if (!r) continue
    lostReasonCounts.set(r, (lostReasonCounts.get(r) ?? 0) + 1)
  }
  const lostReasons = Array.from(lostReasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="size-5 text-blue-600" />
          Relatórios — Marketing
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Últimos {days} dia(s) • SLA de resposta: {SLA_THRESHOLD_MINUTES} min
        </p>
      </div>

      <ReportsClient
        period={period}
        pipelineFilter={pipelineFilter}
        pipelines={pipelines ?? []}
        funnel={funnel}
        kpis={{
          totalConvs,
          wonCount,
          lostCount,
          winRate,
          wonValue,
          openValue,
          avgResponseSec,
          medianResponseSec,
          slaRate,
          slaThresholdMinutes: SLA_THRESHOLD_MINUTES,
          responseSampleSize: responseTimes.length,
        }}
        lostReasons={lostReasons}
        newContacts={{
          total:         newContactsCount,
          previousTotal: prevContactsCount,
          bySource:      sourcesArray,
          vinculados:    vinculadosCount,
          vinculadoRate: vinculadoRate,
        }}
      />
    </div>
  )
}
