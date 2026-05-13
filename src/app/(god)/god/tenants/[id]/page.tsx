import { supabaseAdmin } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight, Users, ShoppingCart, Package } from "lucide-react"
import Link from "next/link"
import { GodModuleManager } from "@/components/god/god-module-manager"
import { GodTenantActions } from "@/components/god/god-tenant-actions"

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

const DATE = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

export const ALL_MODULES = [
  { key: "core.crm",              label: "CRM de Clientes",        group: "Core" },
  { key: "core.usuarios",         label: "Gestão de Usuários",     group: "Core" },
  { key: "core.dashboard",        label: "Dashboard & Relatórios", group: "Core" },
  { key: "pescados.pedidos",      label: "Pedidos",                group: "Pescados" },
  { key: "pescados.produtos",     label: "Produtos",               group: "Pescados" },
  { key: "pescados.separacao",    label: "Separação Física",       group: "Pescados" },
  { key: "pescados.rotas",        label: "Rotas de Entrega",       group: "Pescados" },
  { key: "moveis.projetos",       label: "Projetos",               group: "Móveis" },
  { key: "moveis.produtos",       label: "Produtos",               group: "Móveis" },
  { key: "moveis.orcamentos",     label: "Orçamentos",             group: "Móveis" },
  { key: "moveis.instalacoes",    label: "Instalações",            group: "Móveis" },
  { key: "fiscal.nfe",            label: "Emissão de NF-e",        group: "Fiscal" },
  { key: "fiscal.config",         label: "Config. Tributária",     group: "Fiscal" },
  { key: "financeiro.receber",    label: "Contas a Receber",       group: "Financeiro" },
  { key: "financeiro.pagamentos", label: "Pagamentos",             group: "Financeiro" },
]

interface Props { params: Promise<{ id: string }> }

export default async function GodTenantDetailPage({ params }: Props) {
  const { id } = await params

  const [
    { data: tenant },
    { data: users },
    { data: overrides },
    { data: plans },
    { count: orderCount },
    { count: customerCount },
    { count: productCount },
  ] = await Promise.all([
    supabaseAdmin
      .from("tenants")
      .select("*, plan_ref:plans(id,name,modules,limits)")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("tenant_users")
      .select("id, role, active, profiles(full_name, email)")
      .eq("tenant_id", id)
      .order("role"),
    supabaseAdmin
      .from("tenant_modules")
      .select("module_key, enabled, note, created_at")
      .eq("tenant_id", id),
    supabaseAdmin.from("plans").select("id, name, modules").eq("is_active", true),
    supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    supabaseAdmin.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", id),
  ])

  if (!tenant) notFound()

  const t            = tenant as any
  const planModules: string[] = Array.isArray(t.modules) ? t.modules : []
  const overrideMap  = Object.fromEntries((overrides ?? []).map((o) => [o.module_key, o]))

  // Pré-calcula no servidor — passa objeto serializável ao client component
  type ModuleOrigin = "plan" | "override-on" | "override-off" | "none"
  const moduleStatuses: Record<string, { active: boolean; origin: ModuleOrigin }> =
    Object.fromEntries(
      ALL_MODULES.map((mod) => {
        const override = overrideMap[mod.key]
        if (override) {
          return [mod.key, { active: override.enabled, origin: override.enabled ? "override-on" : "override-off" }]
        }
        if (planModules.includes(mod.key)) {
          return [mod.key, { active: true, origin: "plan" }]
        }
        return [mod.key, { active: false, origin: "none" }]
      })
    )

  const usersData = (users ?? []) as any[]

  return (
    <div className="min-h-full bg-blue-50">

      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/god/tenants" className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          <span className="text-slate-400 shrink-0">Tenants</span>
          <ChevronRight className="size-3.5 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-900 truncate">{t.name}</span>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${STATUS_COLORS[t.status]}`}>
          {STATUS_LABELS[t.status]}
        </span>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Pedidos",  value: orderCount ?? 0,    icon: ShoppingCart },
                { label: "Clientes", value: customerCount ?? 0, icon: Users },
                { label: "Produtos", value: productCount ?? 0,  icon: Package },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-card px-4 py-4 flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <k.icon className="size-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{k.label}</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums">{k.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <GodModuleManager tenantId={id} allModules={ALL_MODULES} moduleStatuses={moduleStatuses} />

            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">
                  Usuários
                  <span className="ml-2 text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                    {usersData.length}
                  </span>
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {usersData.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-slate-500">
                        {(u.profiles?.full_name ?? u.profiles?.email ?? "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {u.profiles?.full_name ?? u.profiles?.email}
                      </p>
                      {u.profiles?.full_name && (
                        <p className="text-[11px] text-slate-400 truncate">{u.profiles.email}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{u.role}</span>
                    {!u.active && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">inativo</span>
                    )}
                  </div>
                ))}
                {usersData.length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-8">Sem usuários.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Informações</p>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Slug</p>
                  <p className="text-sm font-mono font-medium text-slate-900">{t.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Plano atual</p>
                  <p className="text-sm font-medium text-slate-900">{t.plan}</p>
                </div>
                {t.trial_ends_at && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Trial expira em</p>
                    <p className="text-sm font-medium text-slate-900">{DATE(t.trial_ends_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Criado em</p>
                  <p className="text-sm font-medium text-slate-900">{DATE(t.created_at)}</p>
                </div>
              </div>
            </div>

            <GodTenantActions
              tenantId={id}
              currentStatus={t.status}
              plans={plans ?? []}
              currentPlanId={t.plan_id}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
