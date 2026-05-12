import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"
import { Plus, CreditCard, ChevronRight } from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default async function GodPlanosPage() {
  const [{ data: plans }, { data: tenants }] = await Promise.all([
    supabaseAdmin.from("plans").select("*").order("price_monthly"),
    supabaseAdmin.from("tenants").select("id, plan_id"),
  ])

  const all        = plans ?? []
  const tenantsAll = tenants ?? []

  const usageMap: Record<string, number> = {}
  tenantsAll.forEach((t) => {
    if (t.plan_id) usageMap[t.plan_id] = (usageMap[t.plan_id] ?? 0) + 1
  })

  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Planos</h1>
          <p className="text-xs text-slate-400 mt-0.5">{all.length} planos configurados</p>
        </div>
        <Link
          href="/god/planos/novo"
          className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          <Plus className="size-3.5" /> Novo plano
        </Link>
      </div>

      <div className="px-6 py-6">
        {all.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <CreditCard className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum plano criado</p>
            <Link href="/god/planos/novo" className="inline-flex items-center gap-1.5 h-8 px-4 mt-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
              <Plus className="size-3.5" /> Criar plano
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {all.map((plan: any) => {
              const modules: string[] = Array.isArray(plan.modules) ? plan.modules : []
              const limits = plan.limits ?? {}
              const usage  = usageMap[plan.id] ?? 0
              return (
                <Link
                  key={plan.id}
                  href={`/god/planos/${plan.id}`}
                  className="bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:border-violet-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0" />
                  </div>

                  <p className="text-2xl font-bold text-slate-900 tabular-nums mb-3">
                    {plan.price_monthly === 0 ? "Grátis" : BRL(plan.price_monthly)}
                    {plan.price_monthly > 0 && <span className="text-sm font-normal text-slate-400">/mês</span>}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <p className="text-[11px] text-slate-400">
                      {limits.users ?? "∞"} usuários · {limits.orders_per_month ?? "∞"} pedidos/mês
                    </p>
                    <p className="text-[11px] text-slate-400">{modules.length} módulos incluídos</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${plan.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {usage} {usage === 1 ? "tenant" : "tenants"}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
