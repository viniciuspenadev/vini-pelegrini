import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"
import {
  ScrollText, Building2, CreditCard, Activity, Wrench, Power,
  RefreshCw, Plus, Edit, Trash2, ToggleLeft, ToggleRight, ChevronRight,
} from "lucide-react"

export const dynamic = "force-dynamic"

type LogRow = {
  id:          string
  admin_id:    string
  action:      string
  entity_type: string
  entity_id:   string | null
  metadata:    Record<string, unknown> | null
  created_at:  string
}

const ACTION_STYLE: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  "tenant.created":          { icon: Plus,        color: "text-green-600",  bg: "bg-green-50",  label: "Tenant criado" },
  "tenant.plan.changed":     { icon: CreditCard,  color: "text-violet-600", bg: "bg-violet-50", label: "Plano alterado" },
  "tenant.status.active":    { icon: Power,       color: "text-green-600",  bg: "bg-green-50",  label: "Tenant ativado" },
  "tenant.status.suspended": { icon: Power,       color: "text-red-600",    bg: "bg-red-50",    label: "Tenant suspenso" },
  "tenant.status.trial":     { icon: Power,       color: "text-amber-600",  bg: "bg-amber-50",  label: "Tenant em trial" },
  "module.enabled":          { icon: ToggleRight, color: "text-green-600",  bg: "bg-green-50",  label: "Módulo ativado" },
  "module.disabled":         { icon: ToggleLeft,  color: "text-slate-500",  bg: "bg-slate-100", label: "Módulo desativado" },
  "plan.created":            { icon: Plus,        color: "text-blue-600",   bg: "bg-blue-50",   label: "Plano criado" },
  "plan.updated":            { icon: Edit,        color: "text-blue-600",   bg: "bg-blue-50",   label: "Plano atualizado" },
  "health.rechecked":        { icon: RefreshCw,   color: "text-violet-600", bg: "bg-violet-50", label: "Saúde verificada" },
  "health.recheck_failed":   { icon: Activity,    color: "text-red-600",    bg: "bg-red-50",    label: "Falha no recheck" },
}

const ENTITY_ICONS: Record<string, any> = {
  tenant: Building2,
  plan:   CreditCard,
  health: Activity,
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 1) return "agora"
  if (m < 60) return `há ${m}m`
  if (h < 24) return `há ${h}h`
  return `há ${d}d`
}

interface SearchParams { params: Promise<{}>; searchParams: Promise<{ entity?: string; action?: string; tenant?: string }> }

export default async function GodAuditPage({ searchParams }: SearchParams) {
  const sp = await searchParams

  let q = supabaseAdmin
    .from("god_audit_log")
    .select("id, admin_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  if (sp.entity) q = q.eq("entity_type", sp.entity)
  if (sp.action) q = q.eq("action", sp.action)
  if (sp.tenant) q = q.eq("entity_id", sp.tenant)

  const { data: logs } = await q
  const rows = (logs ?? []) as LogRow[]

  // Resolve admins + tenants em batch
  const adminIds = Array.from(new Set(rows.map((r) => r.admin_id)))
  const entityIds = Array.from(new Set(rows.filter((r) => r.entity_type === "tenant" && r.entity_id).map((r) => r.entity_id!)))
  const planIds = Array.from(new Set(rows.filter((r) => r.entity_type === "plan" && r.entity_id).map((r) => r.entity_id!)))

  const [{ data: admins }, { data: tenants }, { data: plans }] = await Promise.all([
    adminIds.length > 0
      ? supabaseAdmin.from("platform_admins").select("id, profiles:user_id(full_name, email)").in("id", adminIds)
      : Promise.resolve({ data: [] as any[] }),
    entityIds.length > 0
      ? supabaseAdmin.from("tenants").select("id, name, slug").in("id", entityIds)
      : Promise.resolve({ data: [] as any[] }),
    planIds.length > 0
      ? supabaseAdmin.from("plans").select("id, name").in("id", planIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const adminByName = new Map<string, string>()
  for (const a of admins ?? []) {
    const p = (a as any).profiles
    adminByName.set(a.id, p?.full_name ?? p?.email ?? "Admin")
  }
  const tenantById = new Map<string, { name: string; slug: string }>()
  for (const t of tenants ?? []) tenantById.set(t.id, { name: t.name, slug: t.slug })
  const planById = new Map<string, string>()
  for (const p of plans ?? []) planById.set(p.id, p.name)

  // Agrupa por dia
  const byDay: Record<string, LogRow[]> = {}
  for (const r of rows) {
    const day = new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(r)
  }

  const totalToday = rows.filter((r) =>
    new Date(r.created_at).toDateString() === new Date().toDateString()
  ).length

  const FILTERS = [
    { key: "",       label: "Tudo"     },
    { key: "tenant", label: "Tenants"  },
    { key: "plan",   label: "Planos"   },
  ]

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ScrollText className="size-5 text-violet-600" />
          Auditoria
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {rows.length} eventos exibidos • {totalToday} hoje
        </p>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* Filtros */}
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => {
            const active = (sp.entity ?? "") === f.key
            const href   = f.key ? `/god/auditoria?entity=${f.key}` : "/god/auditoria"
            return (
              <Link
                key={f.key || "all"}
                href={href}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <ScrollText className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum evento</p>
            <p className="text-xs text-slate-400">As ações de platform admins aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byDay).map(([day, items]) => (
              <div key={day}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">{day}</p>
                <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden divide-y divide-slate-100">
                  {items.map((r) => {
                    const style = ACTION_STYLE[r.action] ?? {
                      icon: Wrench, color: "text-slate-500", bg: "bg-slate-100", label: r.action,
                    }
                    const Icon       = style.icon
                    const EntIcon    = ENTITY_ICONS[r.entity_type] ?? Wrench
                    const adminName  = adminByName.get(r.admin_id) ?? "Admin"
                    const tenantInfo = r.entity_type === "tenant" && r.entity_id ? tenantById.get(r.entity_id) : null
                    const planName   = r.entity_type === "plan"   && r.entity_id ? planById.get(r.entity_id)   : null
                    const targetName = tenantInfo?.name ?? planName ?? null
                    const targetHref =
                      r.entity_type === "tenant" && r.entity_id ? `/god/tenants/${r.entity_id}` :
                      r.entity_type === "plan"   && r.entity_id ? `/god/planos/${r.entity_id}` :
                      null

                    return (
                      <div key={r.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div className={`size-9 rounded-lg ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`size-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold text-slate-900">{adminName}</span>
                            <span className="text-slate-500"> — </span>
                            <span className={style.color + " font-medium"}>{style.label}</span>
                            {targetName && (
                              <>
                                <span className="text-slate-500"> em </span>
                                {targetHref ? (
                                  <Link href={targetHref} className="font-semibold text-slate-900 hover:text-violet-600 inline-flex items-center gap-0.5">
                                    <EntIcon className="size-3" />
                                    {targetName}
                                    <ChevronRight className="size-3" />
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-slate-900">{targetName}</span>
                                )}
                              </>
                            )}
                          </p>
                          {r.metadata && Object.keys(r.metadata).length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                              {Object.entries(r.metadata).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" • ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-slate-500 whitespace-nowrap">{fmtRelative(r.created_at)}</p>
                          <p className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
