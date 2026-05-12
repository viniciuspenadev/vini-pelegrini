"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveActualWeights, requestBilling } from "@/lib/actions/orders"
import { Button } from "@/components/ui/button"
import { Scale, CheckCircle2, AlertCircle, Pencil, Send } from "lucide-react"
import { maskDecimal, unmaskDecimal } from "@/lib/masks"
import { cn } from "@/lib/utils"

interface Item {
  id:                  string
  product_nome:        string
  product_sku:         string | null
  requested_quantity:  number
  actual_weight:       number | null
  unit_price:          number
  discount_amount?:    number
  unidade_medida:      string
  venda_peso_variavel: boolean
}

interface Props {
  orderId: string
  items:   Item[]
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const FMT = (v: number, um: string) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${um}`

export function OrderWeightsForm({ orderId, items }: Props) {
  const router = useRouter()
  const [pending,  startTransition]  = useTransition()
  const [billing,  startBilling]     = useTransition()

  const variableItems = items.filter((i) => i.venda_peso_variavel)
  const fixedItems    = items.filter((i) => !i.venda_peso_variavel)

  // Verifica se todos os itens variáveis já têm peso confirmado
  const allAlreadySaved = variableItems.every((i) => i.actual_weight != null)

  const [editing, setEditing]     = useState(!allAlreadySaved)
  const [saved,   setSaved]       = useState(allAlreadySaved)
  const [displays, setDisplays]   = useState<Record<string, string>>(
    Object.fromEntries(
      items.map((i) => {
        const raw = i.actual_weight ?? i.requested_quantity
        // Número JS usa ponto — converter para pt-BR (vírgula) antes do mask
        const ptBr = raw.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
        return [i.id, ptBr]
      })
    )
  )

  function getNumeric(id: string) {
    return parseFloat(unmaskDecimal(displays[id] ?? "0")) || 0
  }

  function handleChange(id: string, raw: string) {
    setSaved(false)
    setDisplays((prev) => ({ ...prev, [id]: maskDecimal(raw) }))
  }

  const total = items.reduce((sum, i) => {
    const qty      = i.venda_peso_variavel ? getNumeric(i.id) : i.requested_quantity
    const gross    = qty * i.unit_price
    const discount = i.discount_amount ?? 0
    return sum + gross - discount
  }, 0)

  const allFilled = variableItems.every((i) => getNumeric(i.id) > 0)

  function handleSave() {
    startTransition(async () => {
      const weights = items.map((i) => ({
        itemId:       i.id,
        actualWeight: i.venda_peso_variavel ? getNumeric(i.id) : i.requested_quantity,
      }))
      await saveActualWeights(orderId, weights)
      setSaved(true)
      setEditing(false)
      router.refresh()
    })
  }

  function handleRequestBilling() {
    startBilling(async () => {
      await requestBilling(orderId)
      router.refresh()
    })
  }

  // ── Modo visualização (pós-confirmação) ──
  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="size-5" />
            <p className="font-semibold text-sm">Pesagem confirmada</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="size-3" />
            Editar pesagem
          </button>
        </div>

        {/* Resumo dos pesos */}
        <div className="rounded-xl border border-green-200 bg-green-50/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green-200 bg-green-100/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-green-800">Produto</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-green-800">Solicitado</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-green-800">Pesado</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-green-800">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-100">
              {variableItems.map((item) => {
                const w    = item.actual_weight ?? 0
                const diff = w - item.requested_quantity
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.product_nome}</p>
                      {item.product_sku && (
                        <p className="text-[10px] font-mono text-muted-foreground">{item.product_sku}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {FMT(item.requested_quantity, item.unidade_medida)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-semibold text-green-700">{FMT(w, item.unidade_medida)}</p>
                      {Math.abs(diff) > 0.001 && (
                        <p className={cn("text-[10px] font-medium", diff > 0 ? "text-blue-600" : "text-orange-600")}>
                          {diff > 0 ? "+" : ""}{FMT(diff, item.unidade_medida)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {BRL(w * item.unit_price)}
                    </td>
                  </tr>
                )
              })}
              {fixedItems.map((item) => (
                <tr key={item.id} className="opacity-60">
                  <td className="px-4 py-3 text-sm">{item.product_nome}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground text-xs">Peso fixo</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {FMT(item.requested_quantity, item.unidade_medida)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {BRL(item.requested_quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-green-200 bg-green-100/40">
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-green-900">Total final</td>
                <td className="px-4 py-3 text-right text-base font-bold text-green-900">{BRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Enviar para faturamento */}
        {saved && (
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
            <div>
              <p className="font-semibold text-sm text-orange-900">Pronto para faturar</p>
              <p className="text-xs text-orange-700 mt-0.5">Envie para o financeiro confirmar e emitir a NF.</p>
            </div>
            <Button
              onClick={handleRequestBilling}
              disabled={billing}
              className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            >
              {billing ? "Enviando..." : (
                <>
                  <Send className="size-4" />
                  Enviar para Faturamento
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── Modo edição ──
  return (
    <div className="space-y-5">
      {variableItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Scale className="size-3.5" />
            Informe o peso aferido
          </p>
          <div className="space-y-2">
            {variableItems.map((item) => {
              const numeric  = getNumeric(item.id)
              const subtotal = numeric * item.unit_price
              const diff     = numeric - item.requested_quantity
              const hasDiff  = Math.abs(diff) > 0.001
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    numeric > 0 ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{item.product_nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Solicitado: <span className="font-medium">{FMT(item.requested_quantity, item.unidade_medida)}</span>
                        {" · "}{BRL(item.unit_price)}/{item.unidade_medida}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <input
                          type="text" inputMode="decimal"
                          value={displays[item.id] ?? ""}
                          onChange={(e) => handleChange(item.id, e.target.value)}
                          placeholder="0,000"
                          className={cn(
                            "h-10 w-28 rounded-lg border px-3 pr-8 text-sm font-medium text-right focus:outline-none focus:ring-2 transition-colors",
                            numeric > 0
                              ? "border-green-300 bg-white focus:ring-green-400/30"
                              : "border-amber-300 bg-white focus:ring-amber-400/30"
                          )}
                        />
                        {numeric > 0 && (
                          <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-green-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                        {item.unidade_medida}
                      </span>
                    </div>
                    <div className="text-right shrink-0 min-w-[96px]">
                      <p className="text-sm font-bold text-foreground">{BRL(subtotal)}</p>
                      {hasDiff && numeric > 0 && (
                        <p className={cn("text-[10px] font-medium mt-0.5", diff > 0 ? "text-green-600" : "text-red-500")}>
                          {diff > 0 ? "+" : ""}{FMT(diff, item.unidade_medida)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {fixedItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Peso fixo</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {fixedItems.map((item) => (
                  <tr key={item.id} className="bg-muted/20">
                    <td className="px-4 py-3 font-medium">{item.product_nome}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{FMT(item.requested_quantity, item.unidade_medida)}</td>
                    <td className="px-4 py-3 text-right font-medium">{BRL(item.requested_quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Total recalculado</p>
          <p className="text-2xl font-bold text-foreground">{BRL(total)}</p>
        </div>
        <div className="flex items-center gap-3">
          {!allFilled && (
            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
              <AlertCircle className="size-3.5" />
              {variableItems.filter((i) => getNumeric(i.id) === 0).length} item(s) sem peso
            </div>
          )}
          {allAlreadySaved && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar edição
            </button>
          )}
          <Button
            onClick={handleSave}
            disabled={pending || !allFilled}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {pending ? "Salvando..." : "Confirmar pesagem"}
          </Button>
        </div>
      </div>
    </div>
  )
}
