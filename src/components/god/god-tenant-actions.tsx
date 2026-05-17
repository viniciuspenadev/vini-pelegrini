"use client"

import { useTransition } from "react"
import { updateTenantStatus, updateTenantPlan, updateTenantSegment } from "@/lib/actions/god"
import { ShieldAlert, ShieldCheck, ShieldOff, Briefcase } from "lucide-react"

interface Plan    { id: string; name: string }
interface Segment { slug: string; label: string }
interface Props {
  tenantId:        string
  currentStatus:   string
  plans:           Plan[]
  currentPlanId:   string | null
  segments:        Segment[]
  currentSegment:  string
}

export function GodTenantActions({ tenantId, currentStatus, plans, currentPlanId, segments, currentSegment }: Props) {
  const [pending, startTransition] = useTransition()

  function changeStatus(status: string) {
    startTransition(() => updateTenantStatus(tenantId, status))
  }

  function changePlan(e: React.ChangeEvent<HTMLSelectElement>) {
    const planId = e.target.value
    if (!planId) return
    startTransition(() => updateTenantPlan(tenantId, planId))
  }

  function changeSegment(e: React.ChangeEvent<HTMLSelectElement>) {
    const segment = e.target.value
    if (!segment || segment === currentSegment) return
    if (!confirm(`Trocar segmento de "${currentSegment}" para "${segment}"?\n\nIsso muda como o inbox e o cadastro de cliente se comportam para este tenant.`)) {
      e.target.value = currentSegment
      return
    }
    startTransition(() => updateTenantSegment(tenantId, segment))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Ações</p>
      </div>
      <div className="p-5 space-y-4">

        {/* Segmento */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Briefcase className="size-3" /> Segmento
          </p>
          <select
            value={currentSegment}
            onChange={changeSegment}
            disabled={pending}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          >
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Alterar plano */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">Alterar plano base</p>
          <select
            defaultValue={currentPlanId ?? ""}
            onChange={changePlan}
            disabled={pending}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          >
            <option value="">— Selecionar plano —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">Status do tenant</p>

          {currentStatus !== "active" && (
            <button
              onClick={() => changeStatus("active")}
              disabled={pending}
              className="w-full flex items-center gap-2 h-9 px-3 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="size-4" /> Ativar tenant
            </button>
          )}

          {currentStatus !== "trial" && (
            <button
              onClick={() => changeStatus("trial")}
              disabled={pending}
              className="w-full flex items-center gap-2 h-9 px-3 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="size-4" /> Mover para trial
            </button>
          )}

          {currentStatus !== "suspended" && (
            <button
              onClick={() => changeStatus("suspended")}
              disabled={pending}
              className="w-full flex items-center gap-2 h-9 px-3 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <ShieldOff className="size-4" /> Suspender acesso
            </button>
          )}
        </div>

        {pending && (
          <p className="text-xs text-slate-400 text-center">Aplicando...</p>
        )}
      </div>
    </div>
  )
}
