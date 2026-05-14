import Link from "next/link"
import {
  Sparkles, TrendingUp, ShoppingBag, Calendar, Award,
  AlertCircle, ChevronRight, Activity,
} from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const DATE_REL = (d: string) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0)   return "hoje"
  if (days === 1)   return "ontem"
  if (days < 7)     return `há ${days} dias`
  if (days < 30)    return `há ${Math.floor(days / 7)} semana${Math.floor(days / 7) === 1 ? "" : "s"}`
  if (days < 365)   return `há ${Math.floor(days / 30)} mês${Math.floor(days / 30) === 1 ? "" : "es"}`
  return `há ${Math.floor(days / 365)} ano${Math.floor(days / 365) === 1 ? "" : "s"}`
}

interface PreviousOrder {
  id:           string
  order_number: number
  total:        number
  created_at:   string
}

interface Props {
  customerId:    string
  customerName:  string
  totalOrders:   number       // todos os pedidos do cliente (incluindo este)
  totalRevenue:  number       // total faturado histórico
  avgTicket:     number       // ticket médio
  daysSinceLast: number | null  // dias desde último pedido (excluindo o atual)
  thisOrderTotal: number
  lastOrders:    PreviousOrder[]
  totalOverdueReceivable: number  // valor de receivables vencidos do cliente
}

export function CustomerIntelCard({
  customerId, customerName, totalOrders, totalRevenue,
  avgTicket, daysSinceLast, thisOrderTotal,
  lastOrders, totalOverdueReceivable,
}: Props) {

  // Comparativo com ticket médio
  const variationVsAvg = avgTicket > 0 ? ((thisOrderTotal - avgTicket) / avgTicket) * 100 : 0
  const isAboveAvg = variationVsAvg > 5
  const isBelowAvg = variationVsAvg < -5

  // Frequência interpretada
  const frequencyLabel = daysSinceLast == null
    ? "Primeiro pedido"
    : daysSinceLast <= 7  ? "Cliente recorrente"
    : daysSinceLast <= 30 ? "Mensal"
    : daysSinceLast <= 90 ? "Trimestral"
    :                       "Esporádico"

  const isFirstOrder = totalOrders === 1

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
          <Sparkles className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Inteligência do cliente</p>
        <Link
          href={`/clientes/${customerId}`}
          className="ml-auto text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
        >
          Perfil <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="p-5 space-y-4">

        {/* Banner: primeiro pedido */}
        {isFirstOrder && (
          <div className="rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 px-3 py-2.5 flex items-center gap-2">
            <Award className="size-4 text-violet-600 shrink-0" />
            <p className="text-xs text-violet-900">
              <strong>Primeiro pedido</strong> de {customerName.split(" ")[0]} — oportunidade de fidelizar
            </p>
          </div>
        )}

        {/* Alerta: tem vencidos */}
        {totalOverdueReceivable > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-900">Cliente possui {BRL(totalOverdueReceivable)} vencidos</p>
              <p className="text-[11px] text-red-700">Considere bloquear novos pedidos</p>
            </div>
          </div>
        )}

        {/* Stats em 3 colunas */}
        {!isFirstOrder && (
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Pedidos"
              value={String(totalOrders)}
              hint="histórico"
              icon={<ShoppingBag className="size-3" />}
            />
            <Stat
              label="Ticket médio"
              value={BRL(avgTicket)}
              hint={
                isAboveAvg ? `Este +${Math.abs(variationVsAvg).toFixed(0)}%` :
                isBelowAvg ? `Este -${Math.abs(variationVsAvg).toFixed(0)}%` :
                "Este na média"
              }
              hintColor={isAboveAvg ? "text-green-600" : isBelowAvg ? "text-amber-600" : "text-slate-400"}
              icon={<TrendingUp className="size-3" />}
            />
            <Stat
              label="Frequência"
              value={frequencyLabel}
              hint={daysSinceLast != null ? `Último: ${DATE_REL(lastOrders[0]?.created_at ?? "")}` : "—"}
              icon={<Calendar className="size-3" />}
            />
          </div>
        )}

        {/* Comparativo com este pedido (barra) */}
        {!isFirstOrder && avgTicket > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
              <span className="text-slate-400">Este pedido vs ticket médio</span>
              <span className={
                isAboveAvg ? "text-green-600" :
                isBelowAvg ? "text-amber-600" :
                "text-slate-500"
              }>
                {variationVsAvg >= 0 ? "+" : ""}{variationVsAvg.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              {/* Marker da média */}
              <div className="absolute top-0 bottom-0 w-px bg-slate-400 z-10" style={{ left: "50%" }} />
              {/* Barra do pedido */}
              <div
                className={`h-full rounded-full transition-all ${
                  isAboveAvg ? "bg-green-500" : isBelowAvg ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(100, (thisOrderTotal / Math.max(avgTicket * 2, thisOrderTotal * 1.2)) * 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{BRL(thisOrderTotal)} (este)</span>
              <span>média {BRL(avgTicket)}</span>
            </div>
          </div>
        )}

        {/* Receita total histórica */}
        {!isFirstOrder && (
          <div className="rounded-lg bg-slate-50/60 border border-slate-100 px-3 py-2.5 flex items-center gap-3">
            <Activity className="size-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Receita histórica</p>
              <p className="text-base font-bold text-slate-900 tabular-nums leading-tight">{BRL(totalRevenue)}</p>
            </div>
          </div>
        )}

        {/* Pedidos anteriores */}
        {lastOrders.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pedidos anteriores</p>
            <div className="space-y-0.5">
              {lastOrders.slice(0, 5).map((o) => (
                <Link
                  key={o.id}
                  href={`/pedidos/${o.id}`}
                  className="group flex items-center gap-3 px-2 py-1.5 -mx-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[11px] font-mono font-semibold text-slate-600 group-hover:text-blue-700 transition-colors">
                    #{String(o.order_number).padStart(4, "0")}
                  </span>
                  <span className="flex-1 text-[10px] text-slate-400">{DATE_REL(o.created_at)}</span>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{BRL(Number(o.total ?? 0))}</span>
                  <ChevronRight className="size-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  label, value, hint, hintColor = "text-slate-400", icon,
}: {
  label: string; value: string; hint: string; hintColor?: string; icon: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900 leading-tight">{value}</p>
      <p className={`text-[10px] ${hintColor} mt-0.5 leading-tight truncate`}>{hint}</p>
    </div>
  )
}
