import {
  TrendingUp, AlertCircle, Award, BarChart3,
  ArrowDownRight, ArrowUpRight, MinusCircle,
} from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const PCT = (v: number) => `${v.toFixed(1)}%`

interface ItemMargin {
  id:        string
  nome:      string
  quantity:  number    // actual_weight ?? requested_quantity
  unitPrice: number
  cost:      number | null   // snapshot
  subtotal:  number
}

interface Props {
  items:           ItemMargin[]
  totalRevenue:    number     // displayTotal (final ou estimated)
  totalDiscount:   number
  commissionPct:   number     // % do vendedor responsável
  vendedorName:    string | null
}

export function OrderMarginPanel({
  items, totalRevenue, totalDiscount, commissionPct, vendedorName,
}: Props) {
  // Calcula CMV total apenas considerando itens que têm custo informado
  const itemsWithCost    = items.filter((i) => i.cost != null && i.cost > 0)
  const itemsMissingCost = items.filter((i) => i.cost == null || i.cost === 0)

  const totalCMV = itemsWithCost.reduce((s, i) => s + (Number(i.cost) * i.quantity), 0)
  const revenueWithCostCoverage = itemsWithCost.reduce((s, i) => s + i.subtotal, 0)

  const margemBruta    = revenueWithCostCoverage - totalCMV
  const margemBrutaPct = revenueWithCostCoverage > 0 ? (margemBruta / revenueWithCostCoverage) * 100 : 0
  const comissao       = (totalRevenue * (commissionPct / 100))
  const margemLiquida  = margemBruta - comissao
  const margemLiqPct   = revenueWithCostCoverage > 0 ? (margemLiquida / revenueWithCostCoverage) * 100 : 0

  const coveragePct = items.length > 0 ? (itemsWithCost.length / items.length) * 100 : 0
  const partialCoverage = coveragePct < 100 && coveragePct > 0
  const noCoverage = coveragePct === 0

  // Cor da margem
  const marginColor =
    margemBrutaPct >= 30 ? { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  } :
    margemBrutaPct >= 15 ? { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  } :
    margemBrutaPct > 0   ? { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" } :
                           { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
          <BarChart3 className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Rentabilidade</p>
        {!noCoverage && (
          <span className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${marginColor.bg} ${marginColor.text}`}>
            <span className={`size-1.5 rounded-full ${marginColor.dot}`} />
            Margem {PCT(margemBrutaPct)}
          </span>
        )}
      </div>

      {noCoverage ? (
        <div className="p-6 text-center">
          <MinusCircle className="size-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">Margem indisponível</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Nenhum item deste pedido tem preço de custo cadastrado. Edite o produto e informe o CMV para calcular margem automaticamente.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-5">

          {/* Bloco principal: 3 valores grandes */}
          <div className="grid grid-cols-3 gap-3">
            <KpiBox
              label="Receita"
              value={BRL(revenueWithCostCoverage)}
              hint={totalDiscount > 0 ? `Desconto ${BRL(totalDiscount)}` : null}
              icon={<ArrowUpRight className="size-3.5" />}
              tone="neutral"
            />
            <KpiBox
              label="CMV"
              value={BRL(totalCMV)}
              hint={`${itemsWithCost.length}/${items.length} itens`}
              icon={<ArrowDownRight className="size-3.5" />}
              tone="cost"
            />
            <KpiBox
              label="Margem bruta"
              value={BRL(margemBruta)}
              hint={PCT(margemBrutaPct)}
              icon={<TrendingUp className="size-3.5" />}
              tone={margemBrutaPct >= 30 ? "good" : margemBrutaPct >= 15 ? "warn" : "bad"}
            />
          </div>

          {/* Barra visual: CMV vs Margem */}
          <div className="space-y-1.5">
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
              {revenueWithCostCoverage > 0 && (
                <>
                  <div
                    className="bg-slate-400"
                    style={{ width: `${(totalCMV / revenueWithCostCoverage) * 100}%` }}
                    title={`CMV: ${PCT((totalCMV / revenueWithCostCoverage) * 100)}`}
                  />
                  <div
                    className={`${margemColor(margemBrutaPct).bar}`}
                    style={{ width: `${Math.max(0, (margemBruta / revenueWithCostCoverage) * 100)}%` }}
                    title={`Margem: ${PCT(margemBrutaPct)}`}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-slate-400" /><span className="text-slate-500">CMV</span></span>
              <span className="flex items-center gap-1"><span className={`size-1.5 rounded-full ${margemColor(margemBrutaPct).bar}`} /><span className="text-slate-500">Margem bruta</span></span>
            </div>
          </div>

          {/* Comissão e margem líquida */}
          {commissionPct > 0 && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Award className="size-3 text-slate-400" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Comissão {vendedorName ? `· ${vendedorName.split(" ")[0]}` : ""}
                  </p>
                </div>
                <p className="text-base font-bold text-slate-700 tabular-nums mt-1">{BRL(comissao)}</p>
                <p className="text-[10px] text-slate-400">{PCT(commissionPct)} sobre o pedido</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Margem líquida</p>
                <p className={`text-base font-bold tabular-nums mt-1 ${margemLiqPct >= 15 ? "text-green-700" : margemLiqPct >= 5 ? "text-amber-700" : "text-red-700"}`}>
                  {BRL(margemLiquida)}
                </p>
                <p className="text-[10px] text-slate-400">{PCT(margemLiqPct)} pós-comissão</p>
              </div>
            </div>
          )}

          {/* Alerta de cobertura parcial */}
          {partialCoverage && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2 text-[11px] text-amber-800">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>{itemsMissingCost.length}</strong> {itemsMissingCost.length === 1 ? "item está" : "itens estão"} sem preço de custo cadastrado. Margem real pode ser diferente.
              </span>
            </div>
          )}

          {/* Detalhamento por item (collapsible visual) */}
          {itemsWithCost.length > 0 && (
            <details className="pt-3 border-t border-slate-100 group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Margem por item</p>
                <span className="text-[10px] text-slate-400 group-open:hidden">expandir</span>
                <span className="text-[10px] text-slate-400 hidden group-open:inline">recolher</span>
              </summary>
              <div className="mt-3 space-y-1.5">
                {itemsWithCost.map((i) => {
                  const itemCMV    = Number(i.cost) * i.quantity
                  const itemMargin = i.subtotal - itemCMV
                  const itemPct    = i.subtotal > 0 ? (itemMargin / i.subtotal) * 100 : 0
                  const col        = margemColor(itemPct)
                  return (
                    <div key={i.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <span className={`size-1.5 rounded-full shrink-0 ${col.bar}`} />
                      <p className="text-xs text-slate-700 flex-1 truncate">{i.nome}</p>
                      <p className="text-xs text-slate-400 tabular-nums">{BRL(itemMargin)}</p>
                      <p className={`text-xs font-semibold tabular-nums w-12 text-right ${col.text}`}>{PCT(itemPct)}</p>
                    </div>
                  )
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function KpiBox({
  label, value, hint, icon, tone,
}: {
  label: string; value: string; hint: string | null; icon: React.ReactNode;
  tone: "neutral" | "cost" | "good" | "warn" | "bad"
}) {
  const tones = {
    neutral: "text-slate-900",
    cost:    "text-slate-700",
    good:    "text-green-700",
    warn:    "text-amber-700",
    bad:     "text-red-700",
  }
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-400 mb-1">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-base font-bold tabular-nums leading-tight ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function margemColor(pct: number) {
  if (pct >= 30) return { bar: "bg-green-500",  text: "text-green-700"  }
  if (pct >= 15) return { bar: "bg-amber-500",  text: "text-amber-700"  }
  if (pct > 0)   return { bar: "bg-orange-500", text: "text-orange-700" }
  return            { bar: "bg-red-500",     text: "text-red-700"    }
}
