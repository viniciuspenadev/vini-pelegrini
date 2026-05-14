import Link from "next/link"
import {
  TrendingUp, AlertCircle, CheckCircle2, Award, Clock, Calendar,
  ChevronRight, Sparkles, CreditCard, Receipt,
} from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_SHORT = (d: string) =>
  new Date((d.length > 10 ? d : d + "T12:00:00")).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })

interface Receivable {
  id:           string
  description:  string
  amount:       number
  paid_amount:  number
  due_date:     string
  paid_at:      string | null
  status:       string
}

interface Props {
  customerId:     string
  customerName:   string
  limiteCredito:  number
  receivables:    Receivable[]
}

export function CustomerFinancialSection({ customerId, customerName, limiteCredito, receivables }: Props) {

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split("T")[0]

  // Em aberto (não pago, não cancelado)
  const open      = receivables.filter((r) => !["pago", "cancelado"].includes(r.status))
  const totalOpen = open.reduce((s, r) => s + (Number(r.amount) - Number(r.paid_amount ?? 0)), 0)

  // Pagos (últimos)
  const paid      = receivables
    .filter((r) => r.status === "pago")
    .sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""))
  const totalPaid = paid.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0)

  // ── Aging buckets ──
  function bucket(daysOverdue: number): "a_vencer" | "0_15" | "16_30" | "31_60" | "60_plus" {
    if (daysOverdue <= 0) return "a_vencer"
    if (daysOverdue <= 15) return "0_15"
    if (daysOverdue <= 30) return "16_30"
    if (daysOverdue <= 60) return "31_60"
    return "60_plus"
  }

  const aging = { a_vencer: 0, "0_15": 0, "16_30": 0, "31_60": 0, "60_plus": 0 }
  for (const r of open) {
    const due = new Date(r.due_date + "T12:00:00")
    const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000))
    const key = bucket(daysOverdue)
    aging[key] += Number(r.amount) - Number(r.paid_amount ?? 0)
  }

  const totalOverdue = aging["0_15"] + aging["16_30"] + aging["31_60"] + aging["60_plus"]

  // ── Score de pontualidade (últimos 90 dias) ──
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 90)
  const recentPaid = paid.filter((r) => r.paid_at && new Date(r.paid_at) >= cutoff)

  let onTime = 0
  let lateDaysSum = 0
  for (const r of recentPaid) {
    const paidDate = new Date(r.paid_at!)
    paidDate.setHours(0, 0, 0, 0)
    const dueDate  = new Date(r.due_date + "T12:00:00")
    dueDate.setHours(0, 0, 0, 0)
    const diff = Math.floor((paidDate.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
    if (diff <= 0) onTime++
    else lateDaysSum += diff
  }
  const scoreRaw = recentPaid.length > 0 ? Math.round((onTime / recentPaid.length) * 100) : null
  const avgLateDays = recentPaid.length - onTime > 0
    ? Math.round(lateDaysSum / (recentPaid.length - onTime))
    : 0

  const scoreColor =
    scoreRaw == null     ? "text-slate-400"    :
    scoreRaw >= 90       ? "text-green-600"    :
    scoreRaw >= 70       ? "text-amber-600"    :
                           "text-red-600"

  const creditUsage = limiteCredito > 0 ? Math.min(100, (totalOpen / limiteCredito) * 100) : 0

  const hasAnything = receivables.length > 0

  if (!hasAnything) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="size-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
            <CreditCard className="size-3.5" />
          </span>
          <p className="text-sm font-semibold text-slate-900">Financeiro</p>
        </div>
        <div className="p-8 text-center">
          <Sparkles className="size-5 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">Sem histórico financeiro</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {customerName} ainda não tem recebimentos lançados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
          <CreditCard className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Financeiro</p>
        <Link
          href={`/financeiro/recebimentos?customer=${customerId}`}
          className="ml-auto text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Ver todos <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="p-5 space-y-5">

        {/* KPIs principais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Em aberto */}
          <div className="rounded-xl bg-slate-50/60 border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Em aberto</p>
              <Clock className="size-3.5 text-slate-400" />
            </div>
            <p className={`text-xl font-bold tabular-nums leading-tight ${totalOpen > 0 ? "text-slate-900" : "text-slate-400"}`}>
              {BRL(totalOpen)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{open.length} lançamento{open.length === 1 ? "" : "s"}</p>
          </div>

          {/* Vencidos */}
          <div className={`rounded-xl border p-4 ${totalOverdue > 0 ? "bg-red-50/60 border-red-200" : "bg-slate-50/60 border-slate-100"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>Vencidos</p>
              <AlertCircle className={`size-3.5 ${totalOverdue > 0 ? "text-red-500" : "text-slate-400"}`} />
            </div>
            <p className={`text-xl font-bold tabular-nums leading-tight ${totalOverdue > 0 ? "text-red-700" : "text-slate-400"}`}>
              {BRL(totalOverdue)}
            </p>
            <p className={`text-[11px] mt-1 ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>
              {totalOverdue > 0 ? "Atenção" : "Sem atrasos"}
            </p>
          </div>

          {/* Recebido total */}
          <div className="rounded-xl bg-green-50/60 border border-green-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Já recebido</p>
              <CheckCircle2 className="size-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-700 tabular-nums leading-tight">{BRL(totalPaid)}</p>
            <p className="text-[11px] text-green-600 mt-1">{paid.length} pagamento{paid.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Score + Crédito (lado a lado) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Score de pontualidade */}
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pontualidade</p>
                <p className="text-[10px] text-slate-400">últimos 90 dias</p>
              </div>
              <Award className={`size-4 ${scoreColor}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold tabular-nums leading-none ${scoreColor}`}>
                {scoreRaw == null ? "—" : `${scoreRaw}%`}
              </p>
              {scoreRaw != null && scoreRaw < 100 && avgLateDays > 0 && (
                <p className="text-[10px] text-slate-400">
                  ~{avgLateDays}d atraso médio
                </p>
              )}
            </div>
            {scoreRaw != null && (
              <div className="mt-2.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    scoreRaw >= 90 ? "bg-green-500" :
                    scoreRaw >= 70 ? "bg-amber-500" :
                    "bg-red-500"
                  }`}
                  style={{ width: `${scoreRaw}%` }}
                />
              </div>
            )}
          </div>

          {/* Crédito */}
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Crédito</p>
                <p className="text-[10px] text-slate-400">limite vs em uso</p>
              </div>
              <CreditCard className={`size-4 ${creditUsage >= 90 ? "text-red-500" : creditUsage >= 70 ? "text-amber-500" : "text-slate-400"}`} />
            </div>
            {limiteCredito > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold tabular-nums leading-none text-slate-900">{creditUsage.toFixed(0)}%</p>
                  <p className="text-[10px] text-slate-400">
                    {BRL(totalOpen)} / {BRL(limiteCredito)}
                  </p>
                </div>
                <div className="mt-2.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditUsage >= 90 ? "bg-red-500" :
                      creditUsage >= 70 ? "bg-amber-500" :
                      "bg-blue-500"
                    }`}
                    style={{ width: `${creditUsage}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-slate-400 leading-none">Não definido</p>
                <p className="text-[10px] text-slate-400 mt-1">Sem limite cadastrado</p>
              </>
            )}
          </div>
        </div>

        {/* Aging */}
        {totalOpen > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aging — composição em aberto</p>
            <div className="grid grid-cols-5 gap-1.5">
              <AgingBucket label="A vencer" value={aging.a_vencer}  color="bg-blue-500"   muted={!aging.a_vencer} />
              <AgingBucket label="1-15d"    value={aging["0_15"]}   color="bg-amber-400"  muted={!aging["0_15"]} />
              <AgingBucket label="16-30d"   value={aging["16_30"]}  color="bg-amber-500"  muted={!aging["16_30"]} />
              <AgingBucket label="31-60d"   value={aging["31_60"]}  color="bg-orange-500" muted={!aging["31_60"]} />
              <AgingBucket label="60+ dias" value={aging["60_plus"]} color="bg-red-600"   muted={!aging["60_plus"]} />
            </div>
          </div>
        )}

        {/* Últimos pagamentos */}
        {paid.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Últimos pagamentos</p>
              <p className="text-[10px] text-slate-400">{Math.min(paid.length, 5)} mais recentes</p>
            </div>
            <div className="space-y-0.5">
              {paid.slice(0, 5).map((r) => {
                const dueDate  = new Date(r.due_date + "T12:00:00"); dueDate.setHours(0,0,0,0)
                const paidDate = new Date(r.paid_at!); paidDate.setHours(0,0,0,0)
                const lateDays = Math.floor((paidDate.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
                return (
                  <Link
                    key={r.id}
                    href={`/financeiro/recebimentos/${r.id}`}
                    className="group flex items-center gap-3 px-2 py-1.5 -mx-1 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="size-6 rounded-md bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-3" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{r.description}</p>
                      <p className="text-[10px] text-slate-400">
                        {DATE_SHORT(r.paid_at!.split("T")[0])}
                        {lateDays > 0 ? (
                          <span className="text-amber-600 ml-1">· {lateDays}d atraso</span>
                        ) : (
                          <span className="text-green-600 ml-1">· no prazo</span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-green-700 tabular-nums whitespace-nowrap">{BRL(Number(r.paid_amount ?? r.amount))}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AgingBucket({ label, value, color, muted }: { label: string; value: number; color: string; muted: boolean }) {
  return (
    <div className={`rounded-lg p-2 border ${muted ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50/60"}`}>
      <div className={`h-1 rounded-full mb-1.5 ${muted ? "bg-slate-100" : color}`} />
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
      <p className={`text-[11px] font-bold tabular-nums mt-0.5 leading-tight ${muted ? "text-slate-300" : "text-slate-900"}`}>
        {value > 0 ? BRL(value) : "—"}
      </p>
    </div>
  )
}
