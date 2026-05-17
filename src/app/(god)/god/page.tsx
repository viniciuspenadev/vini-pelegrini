import { supabaseAdmin } from "@/lib/supabase"
import { Building2, Users, ShoppingCart, AlertTriangle, Clock, Activity, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const STATUS_COLORS: Record<string, string> = {
  trial:     "bg-amber-100 text-amber-700",
  active:    "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
}
const STATUS_LABELS: Record<string, string> = {
  trial:     "Trial",
  active:    "Ativo",
  suspended: "Suspenso",
}

export default async function GodDashboardPage() {
  const [
    { data: tenants },
    { count: totalUsers },
    { count: totalOrders },
    { data: instances },
  ] = await Promise.all([
    supabaseAdmin
      .from("tenants")
      .select("id, name, slug, status, plan, modules, created_at, trial_ends_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("tenant_users")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("whatsapp_instances")
      .select("tenant_id, status, last_heartbeat_at, reconnect_attempts, user_disconnected"),
  ])

  const all        = tenants ?? []
  const trialCount = all.filter((t) => t.status === "trial").length
  const activeCount = all.filter((t) => t.status === "active").length
  const suspCount  = all.filter((t) => t.status === "suspended").length

  // Saúde WhatsApp agregada
  const HOUR = 3_600_000
  const nowMs = Date.now()
  const insts = instances ?? []
  const waHealthy  = insts.filter((i: any) =>
    i.status === "connected" &&
    i.last_heartbeat_at &&
    (nowMs - new Date(i.last_heartbeat_at).getTime()) < HOUR
  ).length
  const waDown = insts.filter((i: any) =>
    i.status === "disconnected" &&
    (i.user_disconnected || (i.reconnect_attempts ?? 0) >= 3)
  ).length
  const waDegraded = insts.length - waHealthy - waDown

  const now = new Date()
  const trialsExpiringSoon = all.filter((t) => {
    if (t.status !== "trial" || !t.trial_ends_at) return false
    const days = Math.ceil((new Date(t.trial_ends_at).getTime() - now.getTime()) / 86_400_000)
    return days <= 5 && days >= 0
  })
  const kpis = [
    { label: "Tenants ativos",    value: activeCount,          icon: Building2,   bg: "bg-green-50",  color: "text-green-600" },
    { label: "Em trial",          value: trialCount,           icon: Clock,       bg: "bg-amber-50",  color: "text-amber-600" },
    { label: "Usuários ativos",   value: totalUsers ?? 0,      icon: Users,       bg: "bg-blue-50",   color: "text-blue-600" },
    { label: "Pedidos na plataforma", value: totalOrders ?? 0, icon: ShoppingCart, bg: "bg-violet-50", color: "text-violet-600" },
  ]

  return (
    <div className="min-h-full bg-blue-50">

      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Visão Geral da Plataforma</h1>
        <p className="text-xs text-slate-400 mt-0.5">{all.length} tenants registrados</p>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex items-center gap-4">
              <div className={`size-9 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon className={`size-4 ${k.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Saúde WhatsApp da plataforma */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-violet-600" />
              <p className="text-sm font-semibold text-slate-900">Saúde operacional WhatsApp</p>
            </div>
            <Link href="/god/saude" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
              Ver detalhes →
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="size-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Wifi className="size-4 text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Saudáveis</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{waHealthy}</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Degradados</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{waDegraded}</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <WifiOff className="size-4 text-red-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Caídos</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{waDown}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {trialsExpiringSoon.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {trialsExpiringSoon.length} {trialsExpiringSoon.length === 1 ? "trial expira" : "trials expiram"} em até 5 dias
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {trialsExpiringSoon.map((t) => t.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Distribuição por status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Distribuição por plano</p>
            </div>
            <div className="p-5 space-y-2">
              {["trial", "active", "suspended"].map((s) => {
                const count = all.filter((t) => t.status === s).length
                const pct   = all.length > 0 ? (count / all.length) * 100 : 0
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_COLORS[s]} w-20 text-center`}>
                      {STATUS_LABELS[s]}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s === "active" ? "bg-green-500" : s === "trial" ? "bg-amber-500" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 tabular-nums w-6 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tenants recentes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Tenants recentes</p>
              <Link href="/god/tenants" className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                Ver todos
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {all.slice(0, 5).map((t) => (
                <Link
                  key={t.id}
                  href={`/god/tenants/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <div className="size-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-violet-600">{t.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.slug}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </Link>
              ))}
              {all.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-8">Nenhum tenant ainda.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
