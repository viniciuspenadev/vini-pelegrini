"use client"

import { useState, useTransition } from "react"
import { toggleTenantModule } from "@/lib/actions/god"
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, AlertTriangle } from "lucide-react"

type ModuleOrigin = "plan" | "override-on" | "override-off" | "none"

interface Module {
  key:         string
  label:       string
  group:       string
  segment?:    string   // se preenchido, só faz sentido para este segmento
  comingSoon?: boolean  // módulo planejado mas sem rota implementada
}

interface Props {
  tenantId:       string
  allModules:     Module[]
  moduleStatuses: Record<string, { active: boolean; origin: ModuleOrigin }>
  currentSegment: string
}

const ORIGIN_LABELS: Record<ModuleOrigin, string> = {
  "plan":         "plano",
  "override-on":  "adicionado",
  "override-off": "removido",
  "none":         "não incluído",
}

export function GodModuleManager({ tenantId, allModules, moduleStatuses, currentSegment }: Props) {
  const [pending, startTransition] = useTransition()
  const [showOtherSegments, setShowOtherSegments] = useState(false)

  function toggle(moduleKey: string, currentlyActive: boolean) {
    startTransition(() => toggleTenantModule(tenantId, moduleKey, !currentlyActive))
  }

  // Divide módulos em 3 baldes:
  //  1. Universais (sem segment) — sempre mostrados
  //  2. Do segmento atual — sempre mostrados em destaque
  //  3. De outros segmentos — colapsados por default (com aviso)
  const universal     = allModules.filter((m) => !m.segment)
  const currentSeg    = allModules.filter((m) => m.segment === currentSegment)
  const otherSeg      = allModules.filter((m) => m.segment && m.segment !== currentSegment)

  // Agrupa por `group` mantendo a ordem original
  function groupBy(list: Module[]): Array<{ group: string; items: Module[] }> {
    const order: string[] = []
    const map = new Map<string, Module[]>()
    for (const m of list) {
      if (!map.has(m.group)) { map.set(m.group, []); order.push(m.group) }
      map.get(m.group)!.push(m)
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }))
  }

  const universalGroups   = groupBy(universal)
  const currentSegGroups  = groupBy(currentSeg)
  const otherSegGroups    = groupBy(otherSeg)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Módulos</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Segmento atual: <strong className="text-slate-700 capitalize">{currentSegment}</strong>
          </p>
        </div>
        <p className="text-[11px] text-slate-400 max-w-xs text-right">
          Alterações aplicadas no próximo acesso do tenant.
        </p>
      </div>

      <div className="divide-y divide-slate-100">

        {/* Módulos do segmento atual */}
        {currentSegGroups.map(({ group, items }) => (
          <ModuleGroupSection
            key={group}
            group={group}
            items={items}
            highlight
            moduleStatuses={moduleStatuses}
            pending={pending}
            onToggle={toggle}
          />
        ))}

        {/* Módulos universais (core, marketing, financeiro, fiscal) */}
        {universalGroups.map(({ group, items }) => (
          <ModuleGroupSection
            key={group}
            group={group}
            items={items}
            moduleStatuses={moduleStatuses}
            pending={pending}
            onToggle={toggle}
          />
        ))}

        {/* Módulos de outros segmentos — colapsados */}
        {otherSegGroups.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowOtherSegments((v) => !v)}
              className="w-full flex items-center gap-2 px-5 py-2.5 bg-amber-50/40 hover:bg-amber-50 transition-colors"
            >
              <AlertTriangle className="size-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Módulos de outros segmentos ({otherSegGroups.reduce((s, g) => s + g.items.length, 0)})
              </span>
              <ChevronDown className={`size-3.5 text-amber-500 ml-auto transition-transform ${showOtherSegments ? "rotate-180" : ""}`} />
            </button>

            {showOtherSegments && (
              <div className="bg-amber-50/20">
                <p className="text-[11px] text-amber-700 italic px-5 py-2 bg-amber-50/40 border-b border-amber-100">
                  Estes módulos foram criados para outros segmentos.
                  Habilite só se o tenant precisa usar funcionalidade cruzada.
                </p>
                {otherSegGroups.map(({ group, items }) => (
                  <ModuleGroupSection
                    key={group}
                    group={`${group} (segmento: ${items[0]?.segment})`}
                    items={items}
                    moduleStatuses={moduleStatuses}
                    pending={pending}
                    onToggle={toggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Seção de grupo de módulos ────────────────────────────────
function ModuleGroupSection({
  group, items, highlight, moduleStatuses, pending, onToggle,
}: {
  group:          string
  items:          Module[]
  highlight?:     boolean
  moduleStatuses: Record<string, { active: boolean; origin: ModuleOrigin }>
  pending:        boolean
  onToggle:       (key: string, current: boolean) => void
}) {
  return (
    <div>
      <div className={`px-5 py-2 ${highlight ? "bg-violet-50/60 border-l-2 border-l-violet-500" : "bg-slate-50"}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${highlight ? "text-violet-700" : "text-slate-400"}`}>
          {group}
          {highlight && <span className="ml-2 text-[9px] font-bold text-violet-500">• SEGMENTO</span>}
        </p>
      </div>
      {items.map((mod) => {
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
              <p className={`text-sm font-medium flex items-center gap-2 ${active ? "text-slate-900" : "text-slate-400"}`}>
                {mod.label}
                {mod.comingSoon && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    Em breve
                  </span>
                )}
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
              onClick={() => onToggle(mod.key, active)}
              disabled={pending || mod.comingSoon}
              title={mod.comingSoon ? "Módulo em desenvolvimento — sem código implementado ainda" : ""}
              className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-green-200 text-green-700 hover:bg-green-50"
              }`}
            >
              {mod.comingSoon ? "Bloqueado" : active ? "Remover" : "Adicionar"}
            </button>
          </div>
        )
      })}
    </div>
  )
}
