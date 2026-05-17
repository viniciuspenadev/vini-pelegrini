"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  Trophy, X as XIcon, Clock, AlertTriangle, DollarSign,
  TrendingUp, TrendingDown, ArrowRight, Target, UserPlus,
} from "lucide-react"

interface Pipeline { id: string; name: string; color: string; is_default: boolean }
interface FunnelStage {
  stage_id: string
  name:     string
  color:    string
  is_won:   boolean
  is_lost:  boolean
  count:    number
  value:    number
}
interface Kpis {
  totalConvs:          number
  wonCount:            number
  lostCount:           number
  winRate:             number | null
  wonValue:            number
  openValue:           number
  avgResponseSec:      number | null
  medianResponseSec:   number | null
  slaRate:             number | null
  slaThresholdMinutes: number
  responseSampleSize:  number
}

interface NewContactsData {
  total:         number
  previousTotal: number
  bySource:      Array<{ source: string; count: number }>
  vinculados:    number
  vinculadoRate: number | null
}

interface Props {
  period:         string
  pipelineFilter: string | null
  pipelines:      Pipeline[]
  funnel:         FunnelStage[]
  kpis:           Kpis
  lostReasons:    Array<{ reason: string; count: number }>
  newContacts:    NewContactsData
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  whatsapp_inbound:  { label: "WhatsApp (recebido)",  color: "#22c55e" },
  whatsapp_outbound: { label: "WhatsApp (iniciado)",  color: "#3b82f6" },
  manual:            { label: "Cadastro manual",       color: "#a855f7" },
  import:            { label: "Importado",             color: "#f59e0b" },
  instagram:         { label: "Instagram",             color: "#ec4899" },
  webform:           { label: "Formulário do site",    color: "#06b6d4" },
}

function labelForSource(src: string): { label: string; color: string } {
  return SOURCE_LABELS[src] ?? { label: src, color: "#94a3b8" }
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function formatDuration(sec: number | null): string {
  if (sec == null) return "—"
  if (sec < 60)      return `${Math.round(sec)}s`
  if (sec < 3600)    return `${Math.round(sec / 60)}min`
  return `${(sec / 3600).toFixed(1)}h`
}

const PERIODS = [
  { key: "hoje", label: "Hoje" },
  { key: "7d",   label: "7 dias" },
  { key: "30d",  label: "30 dias" },
  { key: "90d",  label: "90 dias" },
]

export function ReportsClient({ period, pipelineFilter, pipelines, funnel, kpis, lostReasons, newContacts }: Props) {
  const deltaContacts = newContacts.total - newContacts.previousTotal
  const deltaSign     = deltaContacts === 0 ? "neutral" : deltaContacts > 0 ? "up" : "down"
  const deltaPct      = newContacts.previousTotal > 0
    ? Math.round((deltaContacts / newContacts.previousTotal) * 100)
    : null
  const maxBySource = Math.max(...newContacts.bySource.map((s) => s.count), 1)

  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString())
    if (value) sp.set(key, value); else sp.delete(key)
    router.push(`${pathname}?${sp.toString()}`)
  }

  // Métricas de funil
  const activeStages   = funnel.filter((s) => !s.is_won && !s.is_lost)
  const totalActive    = activeStages.reduce((s, st) => s + st.count, 0)
  const maxStageCount  = Math.max(...funnel.map((s) => s.count), 1)
  const totalPipelineR = activeStages.reduce((s, st) => s + st.value, 0)
  const maxStageValue  = Math.max(...activeStages.map((s) => s.value), 1)

  const wonStage  = funnel.find((s) => s.is_won)
  const lostStage = funnel.find((s) => s.is_lost)

  return (
    <div className="px-6 py-6 space-y-6">

      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-card">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setParam("period", p.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                period === p.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {pipelines.length > 1 && (
          <select
            value={pipelineFilter ?? ""}
            onChange={(e) => setParam("pipeline", e.target.value || null)}
            className="h-8 px-3 text-xs font-semibold bg-white rounded-lg border border-slate-200 shadow-card focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Conversas no período"
          value={kpis.totalConvs.toLocaleString("pt-BR")}
          icon={TrendingUp}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <KpiCard
          label="Negócios ganhos"
          value={kpis.wonCount.toLocaleString("pt-BR")}
          sub={BRL(kpis.wonValue)}
          icon={Trophy}
          color="text-green-600"
          bg="bg-green-50"
        />
        <KpiCard
          label="Win rate"
          value={kpis.winRate != null ? `${Math.round(kpis.winRate * 100)}%` : "—"}
          sub={`${kpis.wonCount}W / ${kpis.lostCount}L decididas`}
          icon={Target}
          color={kpis.winRate != null && kpis.winRate >= 0.5 ? "text-green-600" : "text-amber-600"}
          bg={kpis.winRate != null && kpis.winRate >= 0.5 ? "bg-green-50" : "bg-amber-50"}
        />
        <KpiCard
          label="Pipeline em aberto"
          value={BRL(kpis.openValue)}
          sub={`${totalActive} conversa(s)`}
          icon={DollarSign}
          color="text-violet-600"
          bg="bg-violet-50"
        />
      </div>

      {/* ── Novos contatos no período ─────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="size-4 text-blue-600" />
              Novos contatos no período
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Entrada da base — por origem
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="px-5 py-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total novos</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{newContacts.total}</p>
            {deltaPct != null && (
              <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                deltaSign === "up"   ? "text-green-600" :
                deltaSign === "down" ? "text-red-600"   :
                                       "text-slate-400"
              }`}>
                {deltaSign === "up"   && <TrendingUp className="size-3" />}
                {deltaSign === "down" && <TrendingDown className="size-3" />}
                {deltaContacts > 0 ? "+" : ""}{deltaPct}% vs período anterior
                <span className="text-slate-400 font-normal">({newContacts.previousTotal})</span>
              </p>
            )}
            {deltaPct == null && newContacts.total > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">Sem histórico anterior</p>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">% Vinculados a cliente</p>
            <p className={`text-3xl font-bold tabular-nums ${
              newContacts.vinculadoRate == null  ? "text-slate-400" :
              newContacts.vinculadoRate >= 0.5   ? "text-green-600" :
              newContacts.vinculadoRate >= 0.2   ? "text-amber-600" :
                                                   "text-slate-700"
            }`}>
              {newContacts.vinculadoRate != null ? `${Math.round(newContacts.vinculadoRate * 100)}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {newContacts.vinculados} de {newContacts.total} viraram cliente
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Por origem</p>
            {newContacts.bySource.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem novos contatos</p>
            ) : (
              <div className="space-y-1.5">
                {newContacts.bySource.map((s) => {
                  const meta = labelForSource(s.source)
                  const w    = (s.count / maxBySource) * 100
                  return (
                    <div key={s.source}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                          <span className="text-[11px] text-slate-700 truncate">{meta.label}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 tabular-nums">{s.count}</span>
                      </div>
                      <div className="h-1 bg-slate-50 rounded overflow-hidden">
                        <div className="h-full" style={{ width: `${w}%`, backgroundColor: meta.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Funil de conversão ───────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Funil de conversão</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Conversas por estágio do pipeline atual</p>
            </div>
          </div>

          <div className="p-5">
            {funnel.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">
                Sem conversas no período.
              </p>
            ) : (
              <div className="space-y-1.5">
                {funnel.map((stage, idx) => {
                  const pct = totalActive > 0 ? (stage.count / totalActive) * 100 : 0
                  const width = (stage.count / maxStageCount) * 100
                  // Conversão pra próximo estágio (só pra ativos)
                  const nextStage = funnel[idx + 1]
                  const showConv  = nextStage && !stage.is_won && !stage.is_lost && stage.count > 0
                  const convPct   = showConv ? (nextStage.count / stage.count) * 100 : null

                  return (
                    <div key={stage.stage_id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-xs font-semibold text-slate-700 truncate">{stage.name}</span>
                          {stage.is_won  && <Trophy className="size-3 text-amber-500" />}
                          {stage.is_lost && <XIcon className="size-3 text-red-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] shrink-0">
                          <span className="text-slate-400">{pct.toFixed(0)}% do funil</span>
                          <span className="font-bold text-slate-900 tabular-nums">{stage.count}</span>
                        </div>
                      </div>
                      <div className="h-6 bg-slate-50 rounded overflow-hidden relative">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.max(width, 3)}%`,
                            backgroundColor: stage.color + (stage.is_won ? "" : "CC"),
                          }}
                        />
                      </div>
                      {showConv && convPct != null && (
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <ArrowRight className="size-2.5" />
                          {convPct.toFixed(0)}% avançam para {nextStage.name}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sumário ganho/perdido */}
            {(wonStage || lostStage) && (
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
                <div className="px-3 py-2 rounded-lg bg-green-50/60 border border-green-100">
                  <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">Ganhos</p>
                  <p className="text-lg font-bold text-green-700 tabular-nums">{kpis.wonCount}</p>
                  <p className="text-[10px] text-green-600">{BRL(kpis.wonValue)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-red-50/60 border border-red-100">
                  <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider">Perdidos</p>
                  <p className="text-lg font-bold text-red-700 tabular-nums">{kpis.lostCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Pipeline em R$ por estágio ────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Pipeline em R$</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total: <strong className="text-slate-700">{BRL(totalPipelineR)}</strong>
            </p>
          </div>
          <div className="p-5">
            {activeStages.length === 0 || totalPipelineR === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">
                Sem valores estimados nas conversas.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeStages
                  .filter((s) => s.value > 0)
                  .sort((a, b) => b.value - a.value)
                  .map((stage) => {
                    const w = (stage.value / maxStageValue) * 100
                    return (
                      <div key={stage.stage_id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            <span className="text-[11px] font-medium text-slate-700 truncate">{stage.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-900 tabular-nums shrink-0">
                            {BRL(stage.value)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-50 rounded overflow-hidden">
                          <div className="h-full" style={{ width: `${w}%`, backgroundColor: stage.color }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── SLA de 1ª resposta ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="size-4 text-blue-600" />
              Tempo de 1ª resposta
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Meta: resposta em até <strong>{kpis.slaThresholdMinutes} minutos</strong> • amostra de {kpis.responseSampleSize} conversa(s)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="px-5 py-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tempo médio</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {formatDuration(kpis.avgResponseSec)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Mediana: {formatDuration(kpis.medianResponseSec)}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">% dentro do SLA</p>
            <p className={`text-3xl font-bold tabular-nums ${
              kpis.slaRate == null    ? "text-slate-400" :
              kpis.slaRate >= 0.9     ? "text-green-600" :
              kpis.slaRate >= 0.7     ? "text-amber-600" :
                                        "text-red-600"
            }`}>
              {kpis.slaRate != null ? `${Math.round(kpis.slaRate * 100)}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {kpis.slaRate != null && kpis.slaRate >= 0.9 ? "Excelente" :
               kpis.slaRate != null && kpis.slaRate >= 0.7 ? "Bom, pode melhorar" :
               kpis.slaRate != null                         ? "Precisa atenção" : "Sem amostra"}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Gauge</p>
            <SlaGauge value={kpis.slaRate} />
          </div>
        </div>
      </div>

      {/* ── Motivos de perda ─────────────────────────────────── */}
      {lostReasons.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Principais motivos de perda
            </p>
          </div>
          <div className="p-5 space-y-2">
            {lostReasons.map((r) => {
              const maxCount = lostReasons[0].count
              const w = (r.count / maxCount) * 100
              return (
                <div key={r.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-700 truncate">{r.reason}</span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">{r.count}×</span>
                  </div>
                  <div className="h-1.5 bg-slate-50 rounded overflow-hidden">
                    <div className="h-full bg-red-400" style={{ width: `${w}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

function KpiCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string; sub?: string; icon: any; color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex items-center gap-3">
      <div className={`size-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`size-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function SlaGauge({ value }: { value: number | null }) {
  if (value == null) {
    return <p className="text-xs text-slate-400 italic">Sem amostra</p>
  }
  const pct       = Math.round(value * 100)
  const dashTotal = 100
  const dashed    = Math.min(pct, 100)
  const color =
    value >= 0.9 ? "#16a34a" :
    value >= 0.7 ? "#d97706" :
                   "#dc2626"

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 36 36" className="size-12">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dashed}, ${dashTotal}`}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-[11px] text-slate-500">no SLA</p>
        <p className="text-xs font-bold text-slate-900">{pct}%</p>
      </div>
    </div>
  )
}
