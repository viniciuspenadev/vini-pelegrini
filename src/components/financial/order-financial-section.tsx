import Link from "next/link"
import {
  Receipt, CheckCircle2, AlertCircle, Clock, XCircle,
  ChevronRight, MinusCircle, ExternalLink, Calendar, Sparkles,
} from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_SHORT = (d: string) =>
  new Date((d.length > 10 ? d : d + "T12:00:00")).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short",
  })

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  aberto:    { label: "Em aberto",  bg: "bg-blue-50",   text: "text-blue-700",  dot: "bg-blue-500" },
  parcial:   { label: "Parcial",    bg: "bg-amber-50",  text: "text-amber-700", dot: "bg-amber-500" },
  pago:      { label: "Pago",       bg: "bg-green-50",  text: "text-green-700", dot: "bg-green-500" },
  vencido:   { label: "Vencido",    bg: "bg-red-50",    text: "text-red-700",   dot: "bg-red-500" },
  cancelado: { label: "Cancelado",  bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
}

interface Receivable {
  id:                string
  description:       string
  amount:            number
  paid_amount:       number
  due_date:          string
  paid_at:           string | null
  status:            string
  installment_seq:   number | null
  installment_total: number | null
}

interface Props {
  orderId:       string
  receivables:   Receivable[]
  orderTotal:    number
  autoGenEnabled: boolean
}

export function OrderFinancialSection({ orderId, receivables, orderTotal, autoGenEnabled }: Props) {
  const totalReceivables = receivables.filter((r) => r.status !== "cancelado").reduce((s, r) => s + Number(r.amount), 0)
  const totalPaid        = receivables.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0)
  const totalRemaining   = totalReceivables - totalPaid
  const progressPct      = totalReceivables > 0 ? Math.min(100, (totalPaid / totalReceivables) * 100) : 0

  const hasReceivables = receivables.length > 0
  const allPaid        = hasReceivables && receivables.every((r) => r.status === "pago")
  const allCancelled   = hasReceivables && receivables.every((r) => r.status === "cancelado")

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
          <Receipt className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Financeiro</p>
        {hasReceivables && (
          <span className="ml-auto text-[11px] text-slate-400">
            {receivables.length} parcela{receivables.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!hasReceivables ? (
        // Empty state
        <div className="p-8 text-center">
          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="size-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">Sem recebimentos gerados</p>
          <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto leading-relaxed">
            {autoGenEnabled
              ? "Os recebimentos serão gerados automaticamente quando o pedido atingir o status configurado."
              : "A geração automática está desativada. Habilite em Configurações → Financeiro ou crie manualmente."}
          </p>
          <Link
            href="/financeiro/recebimentos/novo"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Lançar manualmente
          </Link>
        </div>
      ) : (
        <div className="p-5 space-y-5">

          {/* Summary block — barra de progresso */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-base font-bold text-slate-900 tabular-nums leading-tight">{BRL(totalReceivables)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recebido</p>
              <p className={`text-base font-bold tabular-nums leading-tight ${totalPaid > 0 ? "text-green-600" : "text-slate-300"}`}>
                {BRL(totalPaid)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A receber</p>
              <p className={`text-base font-bold tabular-nums leading-tight ${totalRemaining > 0 ? "text-slate-900" : "text-slate-300"}`}>
                {BRL(totalRemaining)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allPaid ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{progressPct.toFixed(0)}% recebido</span>
              {allPaid && <span className="font-semibold text-green-600 flex items-center gap-1"><CheckCircle2 className="size-3" /> Quitado</span>}
              {allCancelled && <span className="font-semibold text-slate-500">Todos cancelados</span>}
            </div>
          </div>

          {/* Lista de parcelas */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Parcelas</p>
            <div className="space-y-1.5">
              {receivables.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.aberto
                const today = new Date().toISOString().split("T")[0]
                const overdue = r.due_date < today && !["pago", "cancelado"].includes(r.status)
                const finalMeta = overdue ? STATUS_META.vencido : meta

                return (
                  <Link
                    key={r.id}
                    href={`/financeiro/recebimentos/${r.id}`}
                    className="group flex items-center gap-3 px-3 py-2 -mx-1 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className={`flex size-7 items-center justify-center rounded-lg ${finalMeta.bg} ${finalMeta.text} shrink-0`}>
                      {r.status === "pago" ? <CheckCircle2 className="size-3.5" /> :
                       r.status === "cancelado" ? <XCircle className="size-3.5" /> :
                       overdue ? <AlertCircle className="size-3.5" /> :
                       <Clock className="size-3.5" />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {r.installment_total && r.installment_total > 1 && (
                          <span className="text-[11px] font-semibold text-violet-700">
                            {r.installment_seq}/{r.installment_total}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${finalMeta.bg} ${finalMeta.text}`}>
                          <span className={`size-1 rounded-full ${finalMeta.dot}`} />
                          {finalMeta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="size-2.5" />
                        {DATE_SHORT(r.due_date)}
                        {r.paid_at && <> · pago em {DATE_SHORT(r.paid_at.split("T")[0])}</>}
                      </p>
                    </div>

                    <p className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                      r.status === "cancelado" ? "text-slate-400 line-through" : "text-slate-900"
                    }`}>
                      {BRL(Number(r.amount))}
                    </p>

                    <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Aviso quando total receivables diverge do total do pedido */}
          {Math.abs(totalReceivables - orderTotal) > 0.01 && !allCancelled && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2 text-[11px] text-amber-800">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>
                Soma das parcelas <strong>{BRL(totalReceivables)}</strong> diverge do total do pedido <strong>{BRL(orderTotal)}</strong>.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
