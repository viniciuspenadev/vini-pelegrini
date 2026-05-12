"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateOrderItems } from "@/lib/actions/orders"
import { Button } from "@/components/ui/button"
import { Package, Pencil, Check, X } from "lucide-react"

interface Item {
  id:                  string
  product_nome:        string
  product_sku:         string | null
  requested_quantity:  number
  actual_weight:       number | null
  unit_price:          number
  subtotal:            number
  discount_pct:        number
  discount_amount:     number
  item_notes:          string | null
  unidade_medida:      string
  venda_peso_variavel: boolean
}

interface Props {
  orderId:        string
  status:         string
  canEdit:        boolean
  items:          Item[]
  isFinal:        boolean
  displayTotal:   number
  estimatedTotal: number | null
  totalDiscount:  number
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const EDITABLE_STATUSES = ["recebido", "em_separacao"]

const numInput = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-right font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"

export function OrderItemsEditor({ orderId, status, canEdit, items, isFinal, displayTotal, estimatedTotal, totalDiscount }: Props) {
  const router          = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const isSeparacao      = status === "em_separacao"
  const allowEdit        = canEdit && EDITABLE_STATUSES.includes(status)

  const [draft, setDraft] = useState<Record<string, {
    requested_quantity: number
    unit_price:         number
    discount_pct:       number
    item_notes:         string
  }>>(() =>
    Object.fromEntries(items.map((i) => [i.id, {
      requested_quantity: i.requested_quantity,
      unit_price:         i.unit_price,
      discount_pct:       i.discount_pct,
      item_notes:         i.item_notes ?? "",
    }]))
  )

  function setField(id: string, key: string, value: string | number) {
    setDraft(d => ({ ...d, [id]: { ...d[id], [key]: value } }))
  }

  function calcSubtotal(id: string) {
    const d = draft[id]
    const gross = d.requested_quantity * d.unit_price
    return gross - gross * (d.discount_pct / 100)
  }

  const draftTotal = items.reduce((sum, i) => sum + calcSubtotal(i.id), 0)

  function handleSave() {
    start(async () => {
      await updateOrderItems(orderId, items.map((i) => ({
        id:                 i.id,
        requested_quantity: draft[i.id].requested_quantity,
        unit_price:         draft[i.id].unit_price,
        discount_pct:       draft[i.id].discount_pct,
        item_notes:         draft[i.id].item_notes || null,
      })))
      setEditing(false)
      router.refresh()
    })
  }

  function handleCancel() {
    setDraft(Object.fromEntries(items.map((i) => [i.id, {
      requested_quantity: i.requested_quantity,
      unit_price:         i.unit_price,
      discount_pct:       i.discount_pct,
      item_notes:         i.item_notes ?? "",
    }])))
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Itens do pedido</p>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600">
            {items.length} {items.length === 1 ? "produto" : "produtos"}
          </span>
        </div>
        {allowEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil className="size-3" /> Editar itens
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={pending} className="h-7 px-2 text-xs gap-1 text-slate-500">
              <X className="size-3" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={pending} className="h-7 px-3 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Check className="size-3" /> {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        /* ── Modo edição ── */
        <div className="flex flex-col gap-2">
          <div
            className="hidden sm:grid items-center gap-3 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100"
            style={{ gridTemplateColumns: "1fr 110px 120px 80px 90px" }}
          >
            <span>Produto</span>
            <span className="text-right">Quantidade</span>
            <span className="text-right">Preço unit.</span>
            <span className="text-right">Desc %</span>
            <span className="text-right">Subtotal</span>
          </div>

          {items.map((item) => {
            const d   = draft[item.id]
            const sub = calcSubtotal(item.id)
            return (
              <div
                key={item.id}
                className="grid items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                style={{ gridTemplateColumns: "1fr 110px 120px 80px 90px" }}
              >
                <div>
                  <p className="font-medium text-sm text-slate-900">{item.product_nome}</p>
                  {item.product_sku && (
                    <p className="text-[10px] font-mono text-slate-400">{item.product_sku}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <input type="number" step="0.001" min="0"
                    value={d.requested_quantity}
                    onChange={(e) => setField(item.id, "requested_quantity", parseFloat(e.target.value) || 0)}
                    className={numInput} style={{ width: 72 }} />
                  <span className="text-xs text-slate-400 shrink-0">{item.unidade_medida}</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-xs text-slate-400 shrink-0">R$</span>
                  <input type="number" step="0.01" min="0"
                    value={d.unit_price}
                    onChange={(e) => setField(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    className={numInput} style={{ width: 80 }} />
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <input type="number" step="0.1" min="0" max="100"
                    value={d.discount_pct}
                    onChange={(e) => setField(item.id, "discount_pct", parseFloat(e.target.value) || 0)}
                    className={numInput} style={{ width: 52 }} />
                  <span className="text-xs text-slate-400 shrink-0">%</span>
                </div>
                <p className="text-right font-bold text-sm text-slate-900">{BRL(sub)}</p>
              </div>
            )
          })}

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total recalculado</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{BRL(draftTotal)}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Modo visualização ── */
        <>
          <div className="space-y-1.5 flex-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Package className="size-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{item.product_nome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.product_sku && (
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {item.product_sku}
                        </span>
                      )}
                      {item.venda_peso_variavel && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          PESO VARIÁVEL
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 pl-11 sm:pl-0">
                  {/* Quantidade */}
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-400 mb-0.5">
                      {item.venda_peso_variavel && item.actual_weight != null ? "Solicitado" : "Quantidade"}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.requested_quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}{" "}
                      <span className="text-slate-400 font-normal text-xs">{item.unidade_medida}</span>
                    </p>
                    {item.venda_peso_variavel && item.actual_weight != null && (() => {
                      const diff    = item.actual_weight - item.requested_quantity
                      const absDiff = Math.abs(diff)
                      const pct     = ((diff / item.requested_quantity) * 100).toFixed(1)
                      return (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs font-semibold text-green-600">
                            Pesado: {item.actual_weight.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {item.unidade_medida}
                          </p>
                          {absDiff > 0.001 && (
                            <p className={`text-[10px] font-bold ${diff > 0 ? "text-blue-600" : "text-red-500"}`}>
                              {diff > 0 ? "▲" : "▼"}{" "}
                              {absDiff.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {item.unidade_medida}
                              <span className="font-normal ml-1">({diff > 0 ? "+" : ""}{pct}%)</span>
                            </p>
                          )}
                        </div>
                      )
                    })()}
                    {isSeparacao && item.venda_peso_variavel && item.actual_weight == null && (
                      <p className="text-xs mt-0.5 font-medium text-amber-500">Pendente...</p>
                    )}
                  </div>

                  {/* Unitário */}
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Unitário</p>
                    <p className="text-sm font-medium text-slate-900 tabular-nums">{BRL(item.unit_price)}</p>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs text-slate-400 mb-0.5">Subtotal</p>
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{BRL(item.subtotal)}</p>
                    {item.discount_amount > 0 && (
                      <p className="text-[10px] text-green-600 font-medium">-{BRL(item.discount_amount)}</p>
                    )}
                  </div>
                </div>
                {item.item_notes && (
                  <p className="text-xs text-slate-400 mt-1 pl-11 italic">"{item.item_notes}"</p>
                )}
              </div>
            ))}
          </div>

          {/* Rodapé de totais */}
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
            {totalDiscount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Desconto total</span>
                <span className="text-sm font-medium text-green-600 tabular-nums">- {BRL(totalDiscount)}</span>
              </div>
            )}
            {isFinal && estimatedTotal != null && displayTotal !== estimatedTotal && (
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Estimativa inicial</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{BRL(estimatedTotal)}</span>
                  <span className={`font-semibold tabular-nums ${displayTotal > estimatedTotal ? "text-green-600" : "text-red-500"}`}>
                    {displayTotal > estimatedTotal ? "+" : ""}{BRL(displayTotal - estimatedTotal)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  {isFinal ? "Total final" : "Total estimado"}
                </span>
                {isFinal ? (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Confirmado
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Estimado
                  </span>
                )}
              </div>
              <span className="text-xl font-bold text-slate-900 tabular-nums">{BRL(displayTotal)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
