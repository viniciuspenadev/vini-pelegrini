import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import { RevenueChart } from "@/components/charts/revenue-chart"
import { RankingBars } from "@/components/charts/ranking-bars"
import {
  ChevronRight, Plus, TrendingUp, ShoppingCart, Users, Package,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

const STATUS_CONFIG = [
  { key: "recebido",               label: "Recebido",         color: "bg-blue-500",   text: "text-blue-600",   light: "bg-blue-50" },
  { key: "em_separacao",           label: "Em separação",     color: "bg-amber-500",  text: "text-amber-600",  light: "bg-amber-50" },
  { key: "aguardando_faturamento", label: "Ag. faturamento",  color: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50" },
  { key: "faturado",               label: "Faturado",         color: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-50" },
  { key: "em_rota",                label: "Em rota",          color: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50" },
  { key: "entregue",               label: "Entregue",         color: "bg-green-500",  text: "text-green-600",  light: "bg-green-50" },
]

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

export default async function DashboardPage() {
  const session        = await auth()
  const tenantId       = session!.user.tenantId
  const userId         = session!.user.id
  const role           = session!.user.role
  const firstName      = session!.user.name?.split(" ")[0] ?? "Usuário"
  const isAdminOrOwner = ["owner", "admin"].includes(role)
  const isVendedor     = role === "vendedor"

  const today        = new Date().toISOString().split("T")[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const start30      = new Date(Date.now() - 29 * 86_400_000).toISOString()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  }).format(new Date())

  // ── Queries paralelas ──
  const [
    { count: pedidosHoje },
    { count: clientesAtivos },
    { count: emAndamento },
    { data: trendOrders },
    { data: monthOrders },
    { data: recentOrders },
    { data: allStatusData },
  ] = await Promise.all([
    (() => {
      let q = supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).gte("created_at", today)
      if (isVendedor) q = q.eq("owner_id", userId)
      return q
    })(),
    (() => {
      let q = supabaseAdmin.from("customers").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "ativo")
      if (isVendedor) q = q.eq("vendedor_id", userId)
      return q
    })(),
    (() => {
      let q = supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).not("status", "in", "(cancelado,entregue)")
      if (isVendedor) q = q.eq("owner_id", userId)
      return q
    })(),
    (() => {
      let q = supabaseAdmin.from("orders")
        .select("created_at, final_total_amount, estimated_total_amount")
        .eq("tenant_id", tenantId).neq("status", "cancelado").gte("created_at", start30)
      if (isVendedor) q = q.eq("owner_id", userId)
      return q
    })(),
    (() => {
      let q = supabaseAdmin.from("orders")
        .select("id, owner_id, customer_id, final_total_amount, estimated_total_amount, profiles!orders_owner_id_fkey(full_name), customers(razao_social, nome_fantasia)")
        .eq("tenant_id", tenantId).neq("status", "cancelado").gte("created_at", startOfMonth)
      if (isVendedor) q = q.eq("owner_id", userId)
      return q
    })(),
    (() => {
      let q = supabaseAdmin.from("orders")
        .select("id, order_number, status, priority, estimated_total_amount, final_total_amount, created_at, delivery_date, customers(razao_social, nome_fantasia)")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(8)
      if (isVendedor) q = q.eq("owner_id", userId)
      return q
    })(),
    (() => {
      let q = supabaseAdmin.from("orders").select("status")
        .eq("tenant_id", tenantId).neq("status", "cancelado")
      if (isVendedor) q = q.eq("owner_id", userId)
      return q
    })(),
  ])

  // ── Itens do mês ──
  const monthOrderIds = (monthOrders ?? []).map((o) => o.id)
  const { data: monthItems } = monthOrderIds.length > 0
    ? await supabaseAdmin.from("order_items")
        .select("product_id, requested_quantity, subtotal, products(nome)")
        .in("order_id", monthOrderIds)
    : { data: [] }

  // ── Cálculos ──
  const receitaMes = (monthOrders ?? []).reduce(
    (s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0
  )

  const dayMap: Record<string, number> = {}
  ;(trendOrders ?? []).forEach((o) => {
    const day = o.created_at.split("T")[0]
    dayMap[day] = (dayMap[day] ?? 0) + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0)
  })
  const revenueByDay = Array.from({ length: 30 }, (_, i) => {
    const d   = new Date(Date.now() - (29 - i) * 86_400_000)
    const key = d.toISOString().split("T")[0]
    return { dia: key, receita: dayMap[key] ?? 0 }
  })

  const clientMap: Record<string, { nome: string; receita: number }> = {}
  ;(monthOrders ?? []).forEach((o: any) => {
    const id   = o.customer_id
    const nome = o.customers?.nome_fantasia || o.customers?.razao_social || "—"
    const val  = Number(o.final_total_amount ?? o.estimated_total_amount ?? 0)
    if (!clientMap[id]) clientMap[id] = { nome, receita: 0 }
    clientMap[id].receita += val
  })
  const topClientes = Object.values(clientMap)
    .sort((a, b) => b.receita - a.receita).slice(0, 5)
    .map((c) => ({ label: c.nome, value: c.receita, formatted: BRL(c.receita) }))

  const prodMap: Record<string, { nome: string; receita: number }> = {}
  ;(monthItems ?? []).forEach((i: any) => {
    const id   = i.product_id
    const nome = i.products?.nome || "—"
    const val  = Number(i.subtotal ?? 0)
    if (!prodMap[id]) prodMap[id] = { nome, receita: 0 }
    prodMap[id].receita += val
  })
  const topProdutos = Object.values(prodMap)
    .sort((a, b) => b.receita - a.receita).slice(0, 5)
    .map((p) => ({ label: p.nome, value: p.receita, formatted: BRL(p.receita) }))

  const vendMap: Record<string, { nome: string; receita: number; pedidos: number }> = {}
  if (isAdminOrOwner) {
    ;(monthOrders ?? []).forEach((o: any) => {
      const id   = o.owner_id
      const nome = o.profiles?.full_name || "—"
      const val  = Number(o.final_total_amount ?? o.estimated_total_amount ?? 0)
      if (!vendMap[id]) vendMap[id] = { nome, receita: 0, pedidos: 0 }
      vendMap[id].receita += val
      vendMap[id].pedidos += 1
    })
  }
  const topVendedores = Object.values(vendMap)
    .sort((a, b) => b.receita - a.receita).slice(0, 5)
    .map((v) => ({ label: v.nome, value: v.receita, formatted: BRL(v.receita), sublabel: `${v.pedidos} pedidos` }))

  const statusCounts = (allStatusData ?? []).reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})
  const totalAtivos = allStatusData?.length ?? 0

  const kpis = [
    {
      label:    "Pedidos hoje",
      value:    String(pedidosHoje ?? 0),
      sub:      "criados hoje",
      icon:     ShoppingCart,
      iconBg:   "bg-blue-50",
      iconColor: "text-blue-600",
      href:     "/pedidos",
    },
    {
      label:    "Receita do mês",
      value:    BRL(receitaMes),
      sub:      "pedidos não cancelados",
      icon:     TrendingUp,
      iconBg:   "bg-green-50",
      iconColor: "text-green-600",
      href:     null,
    },
    {
      label:    "Clientes ativos",
      value:    String(clientesAtivos ?? 0),
      sub:      "na carteira",
      icon:     Users,
      iconBg:   "bg-violet-50",
      iconColor: "text-violet-600",
      href:     "/clientes",
    },
    {
      label:    "Em andamento",
      value:    String(emAndamento ?? 0),
      sub:      "aguardando entrega",
      icon:     Package,
      iconBg:   "bg-amber-50",
      iconColor: "text-amber-600",
      href:     "/pedidos",
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
          href="/pedidos/novo"
          className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg"
        >
          <Plus className="size-3.5" /> Novo pedido
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => {
            const inner = (
              <div className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex flex-col gap-3 hover:border-slate-300 transition-colors">
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
            return k.href ? (
              <Link key={k.label} href={k.href}>{inner}</Link>
            ) : (
              <div key={k.label}>{inner}</div>
            )
          })}
        </div>

        {/* ── Receita + Status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Area chart — 2/3 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isVendedor ? "Minha receita" : "Receita total"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Últimos 30 dias</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{BRL(receitaMes)}</p>
                <p className="text-[11px] text-slate-400 mt-1">este mês</p>
              </div>
            </div>
            <div className="px-2 pt-3 pb-4">
              <RevenueChart data={revenueByDay} />
            </div>
          </div>

          {/* Status breakdown — 1/3 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Pipeline</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Pedidos em andamento</p>
              </div>
              <span className="text-xs font-bold text-slate-900 tabular-nums bg-slate-100 px-2.5 py-1 rounded-full">
                {totalAtivos}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {STATUS_CONFIG.map((s) => {
                const count = statusCounts[s.key] ?? 0
                const pct   = totalAtivos > 0 ? Math.round((count / totalAtivos) * 100) : 0
                return (
                  <Link
                    key={s.key}
                    href={`/pedidos?status=${s.key}`}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors group"
                  >
                    <span className={`size-2 rounded-full shrink-0 ${s.color}`} />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{s.label}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold tabular-nums w-5 text-right ${count > 0 ? s.text : "text-slate-300"}`}>
                        {count}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link
                href="/pedidos"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Ver todos os pedidos <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Rankings este mês ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Destaques do mês</h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date())}
            </span>
          </div>
          <div className={`grid gap-4 ${isAdminOrOwner ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>

            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Top clientes</p>
                <Link href="/clientes" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Ver carteira
                </Link>
              </div>
              <div className="p-5">
                <RankingBars items={topClientes} emptyText="Nenhum pedido este mês." />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Top produtos</p>
                <Link href="/produtos" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Ver catálogo
                </Link>
              </div>
              <div className="p-5">
                <RankingBars items={topProdutos} emptyText="Nenhum produto vendido." />
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
                  <RankingBars items={topVendedores} emptyText="Nenhum pedido este mês." />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Últimos pedidos ── */}
        <div>
          <SectionHeader
            title={isVendedor ? "Meus últimos pedidos" : "Últimos pedidos"}
            href="/pedidos"
          />

          {!recentOrders?.length ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <ShoppingCart className="size-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">Nenhum pedido ainda</p>
              <p className="text-xs text-slate-400 mb-4">Crie o primeiro pedido para ver o histórico aqui.</p>
              <LinkButton
                href="/pedidos/novo"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold rounded-lg"
              >
                <Plus className="size-3.5" /> Criar pedido
              </LinkButton>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

              {/* Column headers */}
              <div
                className="hidden sm:grid items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                style={{ gridTemplateColumns: "48px 1fr 80px 120px 160px 110px 20px" }}
              >
                <span />
                <span>Cliente</span>
                <span className="text-center">Pedido</span>
                <span className="text-center">Entrega</span>
                <span className="text-center">Status</span>
                <span className="text-right">Valor</span>
                <span />
              </div>

              {(recentOrders as any[]).map((o, i) => {
                const num     = String(o.order_number ?? 0).padStart(4, "0")
                const nome    = o.customers?.nome_fantasia || o.customers?.razao_social || "—"
                const total   = o.final_total_amount ?? o.estimated_total_amount
                const isFinal = o.final_total_amount != null
                const initial = nome[0]?.toUpperCase() ?? "?"
                const isLast  = i === recentOrders.length - 1
                return (
                  <Link
                    key={o.id}
                    href={`/pedidos/${o.id}`}
                    className={`group hidden sm:grid items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors ${!isLast ? "border-b border-slate-100" : ""}`}
                    style={{ gridTemplateColumns: "48px 1fr 80px 120px 160px 110px 20px" }}
                  >
                    <div className="flex justify-center">
                      <div className="size-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-600">{initial}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate leading-none">{nome}</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-none">
                        {DATE_SHORT(o.created_at.split("T")[0])}
                        {o.priority === "urgente" && (
                          <span className="ml-1.5 text-[10px] font-bold text-red-500">⚡ URGENTE</span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs font-mono font-medium text-slate-500 text-center">#{num}</p>
                    <p className="text-xs text-slate-500 text-center">
                      {o.delivery_date ? DATE_SHORT(o.delivery_date) : <span className="text-slate-300">—</span>}
                    </p>
                    <div className="flex justify-center">
                      <StatusBadge status={o.status} className="text-[10px] font-semibold px-2.5 py-1 rounded-md" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums leading-none">
                        {total != null ? BRL(Number(total)) : "—"}
                      </p>
                      {!isFinal && total != null && (
                        <p className="text-[10px] text-slate-400 mt-0.5">estimado</p>
                      )}
                    </div>
                    <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </Link>
                )
              })}

              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 sm:hidden">
                <Link
                  href="/pedidos"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Ver todos os pedidos <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
