"use client"

import { useTransition, useState } from "react"
import { createPlan, updatePlan } from "@/lib/actions/god"
import { ALL_MODULES } from "@/lib/modules-catalog"

interface Plan {
  id:            string
  name:          string
  description:   string | null
  price_monthly: number
  modules:       string[]
  limits:        { users: number; orders_per_month: number }
  is_active:     boolean
}
interface Props { plan?: Plan }

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-card focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"

const GROUPS = [...new Set(ALL_MODULES.map((m) => m.group))]

export function GodPlanForm({ plan }: Props) {
  const [pending, startTransition] = useTransition()
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(plan?.modules ?? [])
  )

  function toggleModule(key: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("modules", JSON.stringify([...selectedModules]))
    startTransition(() => {
      if (plan) return updatePlan(plan.id, fd)
      return createPlan(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Informações */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-900">Informações do plano</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Nome do plano *</label>
              <input name="name" required defaultValue={plan?.name} className={inputBase} placeholder="Pescados Pro" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Preço mensal (R$)</label>
              <input
                name="price_monthly" type="number" min="0" step="0.01"
                defaultValue={plan?.price_monthly ?? 0}
                className={inputBase}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Descrição</label>
            <input name="description" defaultValue={plan?.description ?? ""} className={inputBase} placeholder="Para distribuidoras de médio porte" />
          </div>
        </div>
      </div>

      {/* Limites */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-900">Limites</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Usuários máximos</label>
            <input
              name="limit_users" type="number" min="1"
              defaultValue={plan?.limits?.users ?? 5}
              className={inputBase}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Pedidos/mês</label>
            <input
              name="limit_orders" type="number" min="1"
              defaultValue={plan?.limits?.orders_per_month ?? 500}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      {/* Módulos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-900">Módulos incluídos</h2>
          <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            {selectedModules.size} selecionados
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="px-5 py-2 bg-slate-50">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{group}</p>
              </div>
              <div className="divide-y divide-slate-50">
                {ALL_MODULES.filter((m) => m.group === group).map((mod) => {
                  const checked = selectedModules.has(mod.key)
                  return (
                    <label
                      key={mod.key}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(mod.key)}
                        className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{mod.label}</p>
                        <p className="text-[10px] font-mono text-slate-400">{mod.key}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <a
          href="/god/planos"
          className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {pending ? "Salvando..." : plan ? "Salvar alterações" : "Criar plano"}
        </button>
      </div>
    </form>
  )
}
