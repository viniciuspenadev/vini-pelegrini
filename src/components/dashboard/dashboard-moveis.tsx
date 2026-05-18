import Link from "next/link"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import { RevenueChart } from "@/components/charts/revenue-chart"
import { RankingBars } from "@/components/charts/ranking-bars"
import {
  ChevronRight, Plus, FolderKanban, Hammer, Calendar, TrendingUp,
  ArrowRight, MapPin, Users, UserCheck,
} from "lucide-react"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

function SectionHeader({ title, href, linkLabel = "Ver todos" }: {
  title: string; href?: string; linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {linkLabel} <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  )
}

export async function DashboardMoveis() {
  const session   = await auth()
  const tenantId  = session!.user.tenantId
  const userId    = session!.user.id
  const role      = session!.user.role
  const firstName = session!.user.name?.split(" ")[0] ?? "Usuário"
  const isAdminOrOwner = ["owner", "admin", "financeiro"].includes(role)
  const isVendedor     = role === "vendedor"

  const todayDate    = new Date()
  const todayISO     = todayDate.toISOString().split("T")[0]
  const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString()
  const start30      = new Date(Date.now() - 29 * 86_400_000).toISOString()
  const in30Date     = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0]

  const hour = todayDate.getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  }).format(todayDate)

  // ── Project statuses do tenant (flags semânticas) ──
  const { data: statuses } = await supabaseAdmin
    .from("project_statuses")
    .select("id, name, color, position, is_initial, is_won, is_completed, is_cancelled")
    .eq("tenant_id", tenantId)
    .order("position")

  const statusList = statuses ?? []
  const statusById = Object.fromEntries(statusList.map((s) => [s.id, s]))

  const completedIds = new Set(statusList.filter((s) => s.is_completed).map((s) => s.id))
  const cancelledIds = new Set(statusList.filter((s) => s.is_cancelled).map((s) => s.id))
  const wonIds       = new Set(statusList.filter((s) => s.is_won).map((s) => s.id))
  const terminalIds  = new Set([...completedIds, ...cancelledIds])

  // ── Queries em paralelo ──
  const [
    { data: openProjects },
    { data: trend30 },
    { data: month30 },
    { data: recentProjects },
    { data: nextInstalls },
  ] = await Promise.all([
    // 1) Projetos abertos (não terminal) — pra KPIs e funil
    (() => {
      let q = supabaseAdmin
        .from("projects")
        .select("id, status_id, contracted_value, estimated_value, paid_value, expected_install_date, assigned_to, customer_id, designer_partner, profiles!projects_assigned_to_fkey ( full_name ), customers ( razao_social, nome_fantasia )")
        .eq("tenant_id", tenantId)
      if (isVendedor) q = q.eq("assigned_to", userId)
      return q
    })(),
    // 2) Projetos criados nos últimos 30 dias (pra gráfico)
    (() => {
      let q = supabaseAdmin
        .from("projects")
        .select("created_at, estimated_value, contracted_value, status_id")
        .eq("tenant_id", tenantId)
        .gte("created_at", start30)
      if (isVendedor) q = q.eq("assigned_to", userId)
      return q
    })(),
    // 3) Projetos do mês (rankings)
    (() => {
      let q = supabaseAdmin
        .from("projects")
        .select("id, customer_id, assigned_to, designer_partner, contracted_value, estimated_value, status_id, profiles!projects_assigned_to_fkey ( full_name ), customers ( razao_social, nome_fantasia )")
        .eq("tenant_id", tenantId)
        .gte("created_at", startOfMonth)
      if (isVendedor) q = q.eq("assigned_to", userId)
      return q
    })(),
    // 4) Últimos 8 projetos (lista no rodapé)
    (() => {
      let q = supabaseAdmin
        .from("projects")
        .select("id, code, name, status_id, contracted_value, estimated_value, expected_install_date, install_cidade, install_estado, created_at, customers ( razao_social, nome_fantasia )")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(8)
      if (isVendedor) q = q.eq("assigned_to", userId)
      return q
    })(),
    // 5) Próximas instalações (próximos 30 dias, não cancelado/completed)
    (() => {
      let q = supabaseAdmin
        .from("projects")
        .select("id, code, name, status_id, expected_install_date, install_cidade, install_estado, customers ( razao_social, nome_fantasia )")
        .eq("tenant_id", tenantId)
        .gte("expected_install_date", todayISO)
        .lte("expected_install_date", in30Date)
        .order("expected_install_date", { ascending: true })
        .limit(8)
      if (isVendedor) q = q.eq("assigned_to", userId)
      return q
    })(),
  ])

  const openList = (openProjects ?? []) as any[]

  // ── KPIs ──
  const activeProjects   = openList.filter((p) => !terminalIds.has(p.status_id))
  const inProduction     = activeProjects.filter((p) => wonIds.has(p.status_id))
  const installsNext30   = (nextInstalls ?? []).filter((p) => !terminalIds.has(p.status_id))
  const pipelineValue    = activeProjects.reduce(
    (s, p) => s + Number(p.contracted_value ?? p.estimated_value ?? 0), 0
  )

  // ── Gráfico: valor de projetos criados por dia (30d) ──
  const monthValue = (month30 ?? []).reduce(
    (s, p: any) => s + Number(p.contracted_value ?? p.estimated_value ?? 0), 0
  )

  const dayMap: Record<string, number> = {}
  ;(trend30 ?? []).forEach((p: any) => {
    const day = p.created_at.split("T")[0]
    dayMap[day] = (dayMap[day] ?? 0) + Number(p.contracted_value ?? p.estimated_value ?? 0)
  })
  const revenueByDay = Array.from({ length: 30 }, (_, i) => {
    const d   = new Date(Date.now() - (29 - i) * 86_400_000)
    const key = d.toISOString().split("T")[0]
    return { dia: key, receita: dayMap[key] ?? 0 }
  })

  // ── Funil de execução: contagem por status (não-cancelado) ──
  const funnelCounts: Record<string, number> = {}
  for (const p of activeProjects) {
    funnelCounts[p.status_id] = (funnelCounts[p.status_id] ?? 0) + 1
  }
  const totalAtivos = activeProjects.length

  // ── Rankings (mês) ──
  const clientMap: Record<string, { nome: string; receita: number }> = {}
  ;(month30 ?? []).forEach((p: any) => {
    const id   = p.customer_id
    const nome = p.customers?.nome_fantasia || p.customers?.razao_social || "—"
    const val  = Number(p.contracted_value ?? p.estimated_value ?? 0)
    if (!clientMap[id]) clientMap[id] = { nome, receita: 0 }
    clientMap[id].receita += val
  })
  const topClientes = Object.values(clientMap)
    .sort((a, b) => b.receita - a.receita).slice(0, 5)
    .map((c) => ({ label: c.nome, value: c.receita, formatted: BRL(c.receita) }))

  const designerMap: Record<string, { nome: string; receita: number; count: number }> = {}
  ;(month30 ?? []).forEach((p: any) => {
    const nome = (p.designer_partner ?? "").trim()
    if (!nome) return
    const val = Number(p.contracted_value ?? p.estimated_value ?? 0)
    if (!designerMap[nome]) designerMap[nome] = { nome, receita: 0, count: 0 }
    designerMap[nome].receita += val
    designerMap[nome].count   += 1
  })
  const topDesigners = Object.values(designerMap)
    .sort((a, b) => b.receita - a.receita).slice(0, 5)
    .map((d) => ({ label: d.nome, value: d.receita, formatted: BRL(d.receita), sublabel: `${d.count} projeto${d.count === 1 ? "" : "s"}` }))

  const vendMap: Record<string, { nome: string; receita: number; projetos: number }> = {}
  if (isAdminOrOwner) {
    ;(month30 ?? []).forEach((p: any) => {
      const id   = p.assigned_to
      if (!id) return
      const nome = p.profiles?.full_name || "—"
      const val  = Number(p.contracted_value ?? p.estimated_value ?? 0)
      if (!vendMap[id]) vendMap[id] = { nome, receita: 0, projetos: 0 }
      vendMap[id].receita  += val
      vendMap[id].projetos += 1
    })
  }
  const topVendedores = Object.values(vendMap)
    .sort((a, b) => b.receita - a.receita).slice(0, 5)
    .map((v) => ({ label: v.nome, value: v.receita, formatted: BRL(v.receita), sublabel: `${v.projetos} projetos` }))

  const kpis = [
    {
      label: "Projetos abertos", value: String(activeProjects.length),
      sub:   "em andamento",
      icon:  FolderKanban, iconBg: "bg-blue-50", iconColor: "text-blue-600",
      href:  "/moveis/projetos",
    },
    {
      label: "Em produção", value: String(inProduction.length),
      sub:   "contrato fechado",
      icon:  Hammer, iconBg: "bg-lime-50", iconColor: "text-lime-600",
      href:  "/moveis/projetos",
    },
    {
      label: "Instalações 30d", value: String(installsNext30.length),
      sub:   "próximos 30 dias",
      icon:  Calendar, iconBg: "bg-amber-50", iconColor: "text-amber-600",
      href:  "/moveis/projetos",
    },
    {
      label: "Valor pipeline", value: BRL(pipelineValue),
      sub:   "contratado em curso",
      icon:  TrendingUp, iconBg: "bg-green-50", iconColor: "text-green-600",
      href:  null,
    },
  ]

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <LinkButton
          href="/moveis/projetos/novo"
          className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg"
        >
          <Plus className="size-3.5" /> Novo projeto
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => {
            const inner = (
              <div className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex flex-col gap-3 hover:border-slate-300 transition-colors h-full">
                <div className={`size-9 rounded-lg ${k.iconBg} flex items-center justify-center shrink-0`}>
                  <k.icon className={`size-4.5 ${k.iconColor}`} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-1">{k.label}</p>
                  <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{k.value}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{k.sub}</p>
                </div>
              </div>
            )
            return k.href ? <Link key={k.label} href={k.href}>{inner}</Link> : <div key={k.label}>{inner}</div>
          })}
        </div>

        {/* ── Gráfico + Funil de execução ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfico — 2/3 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden flex flex-col">
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-none">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isVendedor ? "Meus projetos" : "Projetos criados"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Últimos 30 dias · valor agregado</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{BRL(monthValue)}</p>
                <p className="text-[11px] text-slate-400 mt-1">este mês</p>
              </div>
            </div>
            <div className="px-2 pt-3 pb-4 flex-1 min-h-[280px]">
              <RevenueChart data={revenueByDay} height="100%" />
            </div>
          </div>

          {/* Funil de execução — 1/3 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Funil de execução</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Projetos em andamento</p>
              </div>
              <span className="text-xs font-bold text-slate-900 tabular-nums bg-slate-100 px-2.5 py-1 rounded-full">
                {totalAtivos}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {statusList
                .filter((s) => !s.is_cancelled)
                .map((s) => {
                  const count = funnelCounts[s.id] ?? 0
                  const pct   = totalAtivos > 0 ? Math.round((count / totalAtivos) * 100) : 0
                  return (
                    <Link
                      key={s.id}
                      href={`/moveis/projetos?status=${s.id}`}
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors group"
                    >
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors truncate block">{s.name}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: s.color }}
                          />
                        </div>
                        <span
                          className="text-sm font-bold tabular-nums w-5 text-right"
                          style={{ color: count > 0 ? s.color : "#cbd5e1" }}
                        >
                          {count}
                        </span>
                      </div>
                    </Link>
                  )
                })}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link
                href="/moveis/projetos"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Ver todos os projetos <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Rankings ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Destaques do mês</h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(todayDate)}
            </span>
          </div>
          <div className={`grid gap-4 ${isAdminOrOwner ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>

            {/* Top clientes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">Top clientes</p>
                </div>
                <Link href="/clientes" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Ver carteira
                </Link>
              </div>
              <div className="p-5">
                <RankingBars items={topClientes} emptyText="Nenhum projeto este mês." />
              </div>
            </div>

            {/* Top designers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-3.5 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">Top designers</p>
                </div>
                <span className="text-[11px] text-slate-400">parceiros</span>
              </div>
              <div className="p-5">
                <RankingBars items={topDesigners} emptyText="Nenhum designer vinculado." />
              </div>
            </div>

            {isAdminOrOwner && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">Vendedores</p>
                  <Link href="/usuarios" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Ver equipe
                  </Link>
                </div>
                <div className="p-5">
                  <RankingBars items={topVendedores} emptyText="Nenhum projeto este mês." />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Próximas instalações ── */}
        <div>
          <SectionHeader title="Próximas instalações" href="/moveis/projetos" />

          {!nextInstalls?.length ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <Calendar className="size-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma instalação agendada nos próximos 30 dias.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden divide-y divide-slate-100">
              {(nextInstalls as any[]).map((p) => {
                const status = statusById[p.status_id]
                const customerName = p.customers?.nome_fantasia || p.customers?.razao_social || "—"
                const cityLabel = p.install_cidade
                  ? `${p.install_cidade}${p.install_estado ? `/${p.install_estado}` : ""}`
                  : null
                return (
                  <Link
                    key={p.id}
                    href={`/moveis/projetos/${p.id}`}
                    className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="size-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <Calendar className="size-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600">{p.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {customerName}
                        {cityLabel && <span className="text-slate-400"> · <MapPin className="size-2.5 inline" /> {cityLabel}</span>}
                      </p>
                    </div>
                    {status && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: status.color + "20", color: status.color }}
                      >
                        <span className="size-1 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </span>
                    )}
                    <div className="text-right shrink-0 w-20">
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{DATE_SHORT(p.expected_install_date)}</p>
                    </div>
                    <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Últimos projetos ── */}
        <div>
          <SectionHeader
            title={isVendedor ? "Meus últimos projetos" : "Últimos projetos"}
            href="/moveis/projetos"
          />

          {!recentProjects?.length ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <FolderKanban className="size-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">Nenhum projeto ainda</p>
              <p className="text-xs text-slate-400 mb-4">Crie o primeiro projeto para ver o histórico aqui.</p>
              <LinkButton
                href="/moveis/projetos/novo"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold rounded-lg"
              >
                <Plus className="size-3.5" /> Criar projeto
              </LinkButton>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden divide-y divide-slate-100">
              {(recentProjects as any[]).map((p) => {
                const status = statusById[p.status_id]
                const customerName = p.customers?.nome_fantasia || p.customers?.razao_social || "—"
                const value = Number(p.contracted_value ?? p.estimated_value ?? 0)
                const cityLabel = p.install_cidade
                  ? `${p.install_cidade}${p.install_estado ? `/${p.install_estado}` : ""}`
                  : null
                return (
                  <Link
                    key={p.id}
                    href={`/moveis/projetos/${p.id}`}
                    className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-mono font-semibold text-slate-700 shrink-0 w-20">
                      {p.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600">{p.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {customerName}{cityLabel && <span className="text-slate-400"> · {cityLabel}</span>}
                      </p>
                    </div>
                    {status && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: status.color + "20", color: status.color }}
                      >
                        <span className="size-1 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </span>
                    )}
                    <div className="text-right shrink-0 w-28">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{BRL(value)}</p>
                    </div>
                    <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
