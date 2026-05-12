"use client"

import { useTransition } from "react"
import { toggleTenantModule } from "@/lib/actions/god"
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react"

type ModuleOrigin = "plan" | "override-on" | "override-off" | "none"

interface Module { key: string; label: string; group: string }
interface Props {
  tenantId:      string
  allModules:    Module[]
  moduleStatuses: Record<string, { active: boolean; origin: ModuleOrigin }>
}

const ORIGIN_LABELS: Record<ModuleOrigin, string> = {
  "plan":         "plano",
  "override-on":  "adicionado",
  "override-off": "removido",
  "none":         "não incluído",
}

export function GodModuleManager({ tenantId, allModules, moduleStatuses }: Props) {
  const [pending, startTransition] = useTransition()

  const groups = [...new Set(allModules.map((m) => m.group))]

  function toggle(moduleKey: string, currentlyActive: boolean) {
    startTransition(() => toggleTenantModule(tenantId, moduleKey, !currentlyActive))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Módulos</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Alterações aplicadas imediatamente no próximo acesso do tenant.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map((group) => (
          <div key={group}>
            <div className="px-5 py-2 bg-slate-50">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{group}</p>
            </div>
            {allModules.filter((m) => m.group === group).map((mod) => {
              const status = moduleStatuses[mod.key] ?? { active: false, origin: "none" as ModuleOrigin }
              const { active, origin } = status

              return (
                <div
                  key={mod.key}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  {active ? (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  ) : origin === "override-off" ? (
                    <XCircle className="size-4 text-red-400 shrink-0" />
                  ) : (
                    <MinusCircle className="size-4 text-slate-300 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>
                      {mod.label}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">{mod.key}</p>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                    origin === "plan"         ? "bg-blue-50 text-blue-600"    :
                    origin === "override-on"  ? "bg-green-50 text-green-700"  :
                    origin === "override-off" ? "bg-red-50 text-red-600"      :
                                               "bg-slate-100 text-slate-400"
                  }`}>
                    {ORIGIN_LABELS[origin]}
                  </span>

                  <button
                    onClick={() => toggle(mod.key, active)}
                    disabled={pending}
                    className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                      active
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-green-200 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {active ? "Remover" : "Adicionar"}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
