import { Clock, Timer, TrendingDown, TrendingUp } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  recebido:               "Recebido",
  em_separacao:           "Em separação",
  aguardando_faturamento: "Ag. faturamento",
  faturado:               "Faturado",
  em_rota:                "Em rota",
  entregue:               "Entregue",
  cancelado:              "Cancelado",
}

interface HistoryEntry {
  to_status:  string
  created_at: string
}

interface Props {
  history:     HistoryEntry[]
  currentStatus: string
  deliveryDate:  string | null
}

function durationFromMs(ms: number): string {
  const min = Math.floor(ms / (60 * 1000))
  if (min < 60)      return `${min}min`
  const hours = Math.floor(min / 60)
  if (hours < 24)    return `${hours}h ${min % 60}min`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

export function OrderSlaCard({ history, currentStatus, deliveryDate }: Props) {
  if (!history || history.length === 0) return null

  // Ordem temporal: mais antiga primeiro
  const ordered = [...history].sort((a, b) => a.created_at.localeCompare(b.created_at))

  // Calcula tempo em cada estágio
  type Stage = { status: string; from: string; to: string | null; durationMs: number }
  const stages: Stage[] = []

  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i]
    const next = ordered[i + 1]
    const fromTs = curr.created_at
    const toTs   = next?.created_at ?? null
    const dur    = (toTs ? new Date(toTs).getTime() : Date.now()) - new Date(fromTs).getTime()
    stages.push({ status: curr.to_status, from: fromTs, to: toTs, durationMs: dur })
  }

  const totalMs   = Date.now() - new Date(ordered[0].created_at).getTime()
  const finalized = currentStatus === "entregue" || currentStatus === "cancelado"

  // SLA contra delivery_date prometida
  let slaStatus: "ok" | "warn" | "danger" | null = null
  let slaLabel: string | null = null
  if (deliveryDate && !finalized) {
    const promised = new Date(deliveryDate + "T23:59:59").getTime()
    const now      = Date.now()
    const remaining = promised - now
    const remainingDays = Math.ceil(remaining / (24 * 60 * 60 * 1000))
    if (remaining < 0) {
      slaStatus = "danger"
      slaLabel  = `Atrasado ${-remainingDays}d`
    } else if (remainingDays <= 1) {
      slaStatus = "warn"
      slaLabel  = `${remainingDays}d restante${remainingDays === 1 ? "" : "s"}`
    } else {
      slaStatus = "ok"
      slaLabel  = `${remainingDays}d restantes`
    }
  } else if (finalized && deliveryDate && currentStatus === "entregue") {
    const lastDelivered = ordered.find((h) => h.to_status === "entregue")
    if (lastDelivered) {
      const promised = new Date(deliveryDate + "T23:59:59").getTime()
      const delivered = new Date(lastDelivered.created_at).getTime()
      const diff = Math.ceil((delivered - promised) / (24 * 60 * 60 * 1000))
      if (diff <= 0) {
        slaStatus = "ok"
        slaLabel  = "Entregue no prazo"
      } else {
        slaStatus = "danger"
        slaLabel  = `Entregue ${diff}d após prazo`
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
          <Timer className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">SLA & Cycle time</p>
        {slaLabel && (
          <span className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            slaStatus === "danger" ? "bg-red-50 text-red-700"
            : slaStatus === "warn" ? "bg-amber-50 text-amber-700"
            : "bg-green-50 text-green-700"
          }`}>
            {slaStatus === "danger" ? <TrendingDown className="size-2.5" /> :
             slaStatus === "ok"     ? <TrendingUp   className="size-2.5" /> :
                                      <Clock        className="size-2.5" />}
            {slaLabel}
          </span>
        )}
      </div>

      <div className="p-5 space-y-3">

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {finalized ? "Tempo total" : "Aberto há"}
          </span>
          <span className="text-base font-bold text-slate-900 tabular-nums">{durationFromMs(totalMs)}</span>
        </div>

        {/* Stages */}
        <div className="space-y-1.5 pt-1">
          {stages.map((stage, i) => {
            const isCurrent = stage.to == null  // último estágio
            const widthPct  = Math.min(100, (stage.durationMs / totalMs) * 100)
            const isLong    = stage.durationMs > totalMs * 0.3  // ocupou >30% do tempo total

            return (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`size-1.5 rounded-full shrink-0 ${
                      isCurrent ? "bg-blue-500 animate-pulse" :
                      stage.status === "cancelado" ? "bg-red-500" :
                      "bg-slate-300"
                    }`} />
                    <span className={`truncate ${isCurrent ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                      {STATUS_LABEL[stage.status] ?? stage.status}
                    </span>
                    {isCurrent && !finalized && (
                      <span className="text-[9px] text-blue-500 font-semibold uppercase tracking-wider shrink-0">agora</span>
                    )}
                  </div>
                  <span className={`tabular-nums shrink-0 ${isLong ? "font-bold text-amber-600" : "text-slate-500"}`}>
                    {durationFromMs(stage.durationMs)}
                  </span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCurrent ? "bg-blue-400" :
                      stage.status === "cancelado" ? "bg-red-400" :
                      isLong ? "bg-amber-400" :
                      "bg-slate-300"
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
