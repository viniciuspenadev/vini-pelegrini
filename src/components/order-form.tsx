"use client"

import * as React from "react"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/ui/link-button"
import { createOrder } from "@/lib/actions/orders"
import { getCustomerCredit } from "@/lib/actions/customers"
import { maskDecimal, unmaskDecimal, maskCurrency, unmaskCurrency } from "@/lib/masks"
import {
  Plus, Trash2, Package, AlertCircle, ChevronDown, ChevronUp,
  ClipboardCopy, ShieldAlert, TrendingUp, CheckCircle2, Zap, Weight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductOption {
  id:                  string
  nome:                string
  sku:                 string | null
  unidade_medida:      string
  preco_base:          number
  venda_peso_variavel: boolean
  peso_medio:          number | null
  conservacao:         string | null
}

interface CustomerOption {
  id:                 string
  razao_social:       string
  nome_fantasia:      string | null
  rota_entrega:       string | null
  condicao_pagamento: string | null
  status:             string
  limite_credito:     number
  forma_pagamento:    string | null
  desconto_padrao:    number
}

interface OrderItem {
  _key:               string
  product_id:         string
  product:            ProductOption | null
  quantity:           number
  unit_price:         number
  discount_pct:       number
  discount_amount:    number
  item_notes:         string
  quantity_display:   string
  unit_price_display: string
  discount_display:   string
  show_extra:         boolean
}

interface CustomerCredit {
  creditoEmUso: number
  lastOrder: {
    order_number: number
    items: {
      product_id: string; product_nome: string; sku: string | null
      unidade_medida: string; venda_peso_variavel: boolean
      requested_quantity: number; unit_price: number; discount_pct: number
    }[]
  } | null
}

interface Props {
  customers: CustomerOption[]
  products:  ProductOption[]
}

const PAYMENT_METHODS    = ["PIX", "Boleto", "Dinheiro", "Cheque", "Transferência", "Crédito 30d", "Crédito 60d"]
const PAYMENT_CONDITIONS = ["A vista", "7 dias", "14 dias", "21 dias", "28 dias", "30 dias", "45 dias", "60 dias"]

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const BASE   = "h-9 w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
const INPUT  = cn(BASE, "px-3")
const SELECT = cn(BASE, "px-3 py-1 cursor-pointer")
const ITEM_GRID = "1fr 100px 130px 68px 120px 60px"

function SectionCard({ title, icon, children, action }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-slate-400 [&_svg]:size-4">{icon}</span>}
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-slate-500 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function newItem(): OrderItem {
  return {
    _key: crypto.randomUUID(), product_id: "", product: null,
    quantity: 1, unit_price: 0, discount_pct: 0, discount_amount: 0, item_notes: "",
    quantity_display: "1", unit_price_display: "", discount_display: "",
    show_extra: false,
  }
}

function calcSubtotal(item: OrderItem) {
  return item.quantity * item.unit_price - item.discount_amount
}

export function OrderForm({ customers, products }: Props) {
  const formRef = React.useRef<HTMLFormElement>(null)

  const [pending,          setPending]          = React.useState(false)
  const [customerId,       setCustomerId]       = React.useState("")
  const [items,            setItems]            = React.useState<OrderItem[]>([newItem()])
  const [error,            setError]            = React.useState("")
  const [credit,           setCredit]           = React.useState<CustomerCredit | null>(null)
  const [loadingCredit,    setLoadingCredit]    = React.useState(false)
  const [paymentMethod,    setPaymentMethod]    = React.useState("")
  const [paymentCondition, setPaymentCondition] = React.useState("")
  const [priority,         setPriority]         = React.useState<"normal" | "urgente">("normal")

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const customerOptions: ComboboxOption[] = customers.map((c) => ({
    value: c.id, label: c.razao_social,
    sublabel: c.nome_fantasia ?? c.rota_entrega ?? undefined,
  }))

  const productOptions: ComboboxOption[] = products.map((p) => ({
    value: p.id, label: p.nome,
    sublabel: [p.sku, p.unidade_medida].filter(Boolean).join(" · "),
  }))

  async function handleCustomerChange(id: string) {
    setCustomerId(id)
    setCredit(null)
    if (!id) {
      setPaymentMethod("")
      setPaymentCondition("")
      return
    }
    const cust = customers.find((c) => c.id === id)
    if (cust?.condicao_pagamento) setPaymentCondition(cust.condicao_pagamento)
    if (cust?.forma_pagamento)    setPaymentMethod(cust.forma_pagamento)

    setLoadingCredit(true)
    try {
      const ctx = await getCustomerCredit(id)
      setCredit(ctx)
    } finally {
      setLoadingCredit(false)
    }
  }

  function selectProduct(key: string, productId: string) {
    const product      = products.find((p) => p.id === productId) ?? null
    const price        = product?.preco_base ?? 0
    const discount_pct = selectedCustomer?.desconto_padrao ?? 0
    setItems((prev) => prev.map((item) => {
      if (item._key !== key) return item
      const gross           = item.quantity * price
      const discount_amount = discount_pct > 0 ? gross * discount_pct / 100 : 0
      return {
        ...item, product_id: productId, product,
        unit_price: price,
        unit_price_display:  price > 0 ? maskCurrency(String(Math.round(price * 100))) : "",
        discount_pct,
        discount_amount,
        discount_display: discount_pct > 0 ? String(discount_pct) : "",
      }
    }))
  }

  function updateQty(key: string, raw: string) {
    const display = maskDecimal(raw)
    const numeric = parseFloat(unmaskDecimal(display)) || 0
    setItems((prev) => prev.map((i) => {
      if (i._key !== key) return i
      const gross           = numeric * i.unit_price
      const discount_amount = i.discount_pct > 0 ? gross * i.discount_pct / 100 : i.discount_amount
      return { ...i, quantity: numeric, quantity_display: display, discount_amount }
    }))
  }

  function updatePrice(key: string, raw: string) {
    const display = maskCurrency(raw)
    const numeric = parseFloat(unmaskCurrency(display)) || 0
    setItems((prev) => prev.map((i) => {
      if (i._key !== key) return i
      const gross           = i.quantity * numeric
      const discount_amount = i.discount_pct > 0 ? gross * i.discount_pct / 100 : i.discount_amount
      return { ...i, unit_price: numeric, unit_price_display: display, discount_amount }
    }))
  }

  function updateDiscount(key: string, raw: string) {
    const display = maskDecimal(raw, 2)
    const pct     = parseFloat(unmaskDecimal(display)) || 0
    setItems((prev) => prev.map((i) => {
      if (i._key !== key) return i
      const gross           = i.quantity * i.unit_price
      const discount_amount = gross * pct / 100
      return { ...i, discount_pct: pct, discount_amount, discount_display: display }
    }))
  }

  function updateNotes(key: string, val: string) {
    setItems((prev) => prev.map((i) => i._key !== key ? i : { ...i, item_notes: val }))
  }

  function toggleExtra(key: string) {
    setItems((prev) => prev.map((i) => i._key !== key ? i : { ...i, show_extra: !i.show_extra }))
  }

  function addItem() { setItems((prev) => [...prev, newItem()]) }
  function removeItem(key: string) {
    setItems((prev) => prev.length > 1 ? prev.filter((i) => i._key !== key) : prev)
  }

  function copyLastOrder() {
    if (!credit?.lastOrder?.items.length) return
    const newItems = credit.lastOrder.items
      .filter((i) => products.some((p) => p.id === i.product_id))
      .map((i) => {
        const product      = products.find((p) => p.id === i.product_id) ?? null
        const gross        = i.requested_quantity * i.unit_price
        const disc_amount  = gross * i.discount_pct / 100
        return {
          ...newItem(),
          product_id: i.product_id, product,
          quantity: i.requested_quantity, unit_price: i.unit_price, discount_pct: i.discount_pct,
          discount_amount: disc_amount,
          quantity_display:   String(i.requested_quantity),
          unit_price_display: i.unit_price > 0 ? maskCurrency(String(Math.round(i.unit_price * 100))) : "",
          discount_display:   i.discount_pct > 0 ? String(i.discount_pct) : "",
        }
      })
    if (newItems.length > 0) setItems(newItems)
  }

  const estimatedTotal    = items.reduce((sum, i) => sum + calcSubtotal(i), 0)
  const totalDiscount     = items.reduce((sum, i) => sum + i.discount_amount, 0)
  const creditoEmUso      = credit?.creditoEmUso ?? 0
  const limiteCredito     = selectedCustomer?.limite_credito ?? 0
  const creditoDisponivel = limiteCredito > 0 ? limiteCredito - creditoEmUso : null
  const limitePct         = limiteCredito > 0 ? Math.min(100, (creditoEmUso / limiteCredito) * 100) : 0
  const exceedsCredit     = creditoDisponivel !== null && estimatedTotal > creditoDisponivel
  const isBlocked         = selectedCustomer && selectedCustomer.status !== "ativo"
  const hasVariableWeight = items.some((i) => i.product?.venda_peso_variavel)

  // Peso e conservação
  const totalWeight = items.reduce((s, i) => {
    if (!i.product?.peso_medio || i.product.peso_medio <= 0) return s
    return s + i.quantity * i.product.peso_medio
  }, 0)
  const hasWeightEstimate = items.some((i) => (i.product?.peso_medio ?? 0) > 0 && i.quantity > 0)
  const conservacoes      = [...new Set(items.filter((i) => i.product?.conservacao).map((i) => i.product!.conservacao!))]
  const hasMixedConserv   = conservacoes.includes("congelado") && conservacoes.includes("resfriado")

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!customerId) return setError("Selecione um cliente.")
    if (items.some((i) => !i.product_id)) return setError("Selecione o produto em todos os itens.")
    if (items.some((i) => i.quantity <= 0)) return setError("Quantidade deve ser maior que zero.")

    const fd = new FormData(e.currentTarget)
    setPending(true)
    try {
      await createOrder({
        customer_id:       customerId,
        delivery_date:     fd.get("delivery_date") as string,
        logistics_notes:   fd.get("logistics_notes") as string,
        payment_method:    paymentMethod,
        payment_condition: paymentCondition,
        delivery_time:     fd.get("delivery_time") as string,
        delivery_address:  fd.get("delivery_address") as string,
        customer_po:       fd.get("customer_po") as string || undefined,
        priority,
        items: items.map((i) => ({
          product_id:         i.product_id,
          requested_quantity: i.quantity,
          unit_price:         i.unit_price,
          discount_pct:       i.discount_pct,
          discount_amount:    i.discount_amount,
          item_notes:         i.item_notes || undefined,
        })),
      })
    } catch (err: any) {
      setError(err?.message ?? "Erro ao criar pedido.")
      setPending(false)
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pb-24">

        {/* ── Cliente & Entrega ── */}
        <SectionCard title="Identificação do pedido">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-12 gap-4">

              {/* Cliente */}
              <div className="col-span-12 sm:col-span-8 space-y-1">
                <FL required>Cliente</FL>
                <Combobox
                  options={customerOptions} value={customerId} onChange={handleCustomerChange}
                  placeholder="Selecione o cliente..." searchPlaceholder="Buscar por nome..."
                />
              </div>

              {/* Data de entrega */}
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <FL required>Data de entrega</FL>
                <input type="date" name="delivery_date" required
                  min={new Date().toISOString().split("T")[0]} className={INPUT} />
              </div>
            </div>

            {/* ── Card do cliente após seleção ── */}
            {customerId && (
              <div className="space-y-2">
                {/* Alerta: cliente bloqueado/inativo */}
                {isBlocked && (
                  <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <ShieldAlert className="size-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">
                        Cliente {selectedCustomer!.status === "bloqueado" ? "bloqueado" : "inativo"}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Verifique com o financeiro antes de prosseguir com este pedido.
                      </p>
                    </div>
                  </div>
                )}

                {/* Card de contexto */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {loadingCredit ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="size-3 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                      Carregando informações do cliente...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Info row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedCustomer?.rota_entrega && (
                          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            Rota: {selectedCustomer.rota_entrega}
                          </span>
                        )}
                        {selectedCustomer?.condicao_pagamento && (
                          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            Cond: {selectedCustomer.condicao_pagamento}
                          </span>
                        )}
                        {selectedCustomer?.forma_pagamento && (
                          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            {selectedCustomer.forma_pagamento}
                          </span>
                        )}
                      </div>

                      {/* Crédito */}
                      {credit && limiteCredito > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-500">
                              Em aberto: <span className="font-semibold text-slate-700">{BRL(creditoEmUso)}</span>
                            </span>
                            <span className={cn(
                              "font-semibold",
                              limitePct >= 90 ? "text-red-600" : limitePct >= 70 ? "text-amber-600" : "text-green-600"
                            )}>
                              {BRL(creditoDisponivel!)} disponível
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                limitePct >= 90 ? "bg-red-500" : limitePct >= 70 ? "bg-amber-500" : "bg-blue-600"
                              )}
                              style={{ width: `${limitePct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Limite total: {BRL(limiteCredito)}
                          </p>
                        </div>
                      )}
                      {credit && limiteCredito === 0 && (
                        <p className="text-xs text-slate-400">Sem limite de crédito configurado.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hora + Pagamento */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 sm:col-span-3 space-y-1">
                <FL>Hora preferida</FL>
                <input type="time" name="delivery_time" className={INPUT} />
              </div>

              <div className="col-span-6 sm:col-span-4 space-y-1">
                <FL>Forma de pagamento</FL>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={SELECT}>
                  <option value="">— Selecione —</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="col-span-12 sm:col-span-5 space-y-1">
                <FL>Condição de pagamento</FL>
                <select value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value)} className={SELECT}>
                  <option value="">— Selecione —</option>
                  {PAYMENT_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* PO do cliente + Prioridade */}
              <div className="col-span-12 sm:col-span-8 space-y-1">
                <FL>Nº do pedido do cliente (PO / OC)</FL>
                <input type="text" name="customer_po"
                  placeholder="Ex: OC-2845, PO-001..."
                  className={INPUT} />
              </div>

              <div className="col-span-12 sm:col-span-4 space-y-1">
                <FL>Prioridade</FL>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden h-9">
                  <button
                    type="button" onClick={() => setPriority("normal")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors",
                      priority === "normal"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Normal
                  </button>
                  <button
                    type="button" onClick={() => setPriority("urgente")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors border-l border-slate-200",
                      priority === "urgente"
                        ? "bg-red-500 text-white"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Zap className="size-3.5" /> Urgente
                  </button>
                </div>
              </div>

              <div className="col-span-12 space-y-1">
                <FL>Endereço de entrega alternativo</FL>
                <input type="text" name="delivery_address"
                  placeholder="Deixe em branco para usar o endereço do cliente" className={INPUT} />
              </div>

              <div className="col-span-12 space-y-1">
                <FL>Observações</FL>
                <textarea name="logistics_notes" rows={2}
                  placeholder="Instruções de entrega, referências..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Itens ── */}
        <SectionCard
          title="Itens do pedido"
          icon={<Package />}
          action={
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
              {credit?.lastOrder && credit.lastOrder.items.length > 0 && (
                <button
                  type="button" onClick={copyLastOrder}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <ClipboardCopy className="size-3.5" />
                  Pedido #{String(credit.lastOrder.order_number).padStart(4, "0")}
                </button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addItem}
                className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                <Plus className="size-3.5" /> Adicionar
              </Button>
            </div>
          }
        >
          {/* Header de colunas */}
          <div
            className="hidden sm:grid gap-3 px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: ITEM_GRID }}
          >
            <span>Produto</span>
            <span className="text-center">Quantidade</span>
            <span className="text-right">Preço unit.</span>
            <span className="text-right">Desc. %</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item._key} className="px-5 py-3.5 space-y-2">
                {/* Desktop grid */}
                <div className="hidden sm:grid gap-3 items-start" style={{ gridTemplateColumns: ITEM_GRID }}>
                  {/* Produto */}
                  <div className="space-y-1">
                    <Combobox
                      options={productOptions} value={item.product_id}
                      onChange={(val) => selectProduct(item._key, val)}
                      placeholder="Selecionar produto..." searchPlaceholder="Buscar..."
                    />
                    {item.product?.venda_peso_variavel && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="size-3" /> Peso variável
                      </p>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="flex items-center gap-1.5">
                    <input type="text" inputMode="decimal" value={item.quantity_display}
                      onChange={(e) => updateQty(item._key, e.target.value)}
                      placeholder="0" className={cn(BASE, "px-2 text-center")} />
                    {item.product && (
                      <span className="text-[11px] text-slate-400 shrink-0 w-6">{item.product.unidade_medida}</span>
                    )}
                  </div>

                  {/* Preço */}
                  <div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
                      <input type="text" inputMode="decimal" value={item.unit_price_display}
                        onChange={(e) => updatePrice(item._key, e.target.value)}
                        placeholder="0,00" className={cn(BASE, "pl-7 pr-2 text-right")} />
                    </div>
                    {/* Última venda para este cliente */}
                    {(() => {
                      const lastItem = credit?.lastOrder?.items.find((i) => i.product_id === item.product_id)
                      if (!lastItem || Math.abs(lastItem.unit_price - item.unit_price) < 0.01) return null
                      return (
                        <p className="text-[10px] text-slate-400 text-right mt-0.5 tabular-nums">
                          Última: {BRL(lastItem.unit_price)}
                        </p>
                      )
                    })()}
                  </div>

                  {/* Desconto */}
                  <div className="relative">
                    <input type="text" inputMode="decimal" value={item.discount_display}
                      onChange={(e) => updateDiscount(item._key, e.target.value)}
                      placeholder="0" className={cn(BASE, "pr-6 px-2 text-right")} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right pt-2">
                    <span className={cn("text-sm font-semibold tabular-nums",
                      calcSubtotal(item) > 0 ? "text-slate-900" : "text-slate-400")}>
                      {calcSubtotal(item) > 0 ? BRL(calcSubtotal(item)) : "—"}
                    </span>
                    {item.discount_amount > 0 && (
                      <p className="text-[10px] text-green-600 tabular-nums">-{BRL(item.discount_amount)}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <button type="button" onClick={() => toggleExtra(item._key)} title="Observação"
                      className={cn("rounded-md p-1.5 transition-colors",
                        item.show_extra ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:bg-slate-100")}>
                      {item.show_extra ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>
                    <button type="button" onClick={() => removeItem(item._key)} disabled={items.length === 1}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile */}
                <div className="sm:hidden space-y-2">
                  <Combobox options={productOptions} value={item.product_id}
                    onChange={(val) => selectProduct(item._key, val)}
                    placeholder="Selecionar produto..." searchPlaceholder="Buscar..." />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Qtd.</p>
                      <input type="text" inputMode="decimal" value={item.quantity_display}
                        onChange={(e) => updateQty(item._key, e.target.value)}
                        placeholder="0" className={cn(BASE, "px-2 text-center")} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Preço unit.</p>
                      <input type="text" inputMode="decimal" value={item.unit_price_display}
                        onChange={(e) => updatePrice(item._key, e.target.value)}
                        placeholder="0,00" className={cn(BASE, "px-2 text-right")} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Desc. %</p>
                      <input type="text" inputMode="decimal" value={item.discount_display}
                        onChange={(e) => updateDiscount(item._key, e.target.value)}
                        placeholder="0" className={cn(BASE, "px-2 text-right")} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                      {calcSubtotal(item) > 0 ? BRL(calcSubtotal(item)) : "—"}
                    </span>
                    <button type="button" onClick={() => removeItem(item._key)} disabled={items.length === 1}
                      className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Observação do item */}
                {item.show_extra && (
                  <input type="text" value={item.item_notes}
                    onChange={(e) => updateNotes(item._key, e.target.value)}
                    placeholder="Observação para este item (ex: separar por tamanho, sem cabeça...)"
                    className={cn(INPUT, "text-xs text-slate-600")} />
                )}
              </div>
            ))}
          </div>

          {/* Footer: peso, conservação, totais */}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-2.5">
            {hasMixedConserv && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertCircle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Carga mista:</span> resfriados + congelados — podem exigir transporte separado.
                </p>
              </div>
            )}
            {hasWeightEstimate && totalWeight > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Weight className="size-3.5" />
                  <span>Peso estimado total</span>
                </div>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {totalWeight.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                </span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Desconto total</span>
                <span className="text-green-600 font-medium tabular-nums">- {BRL(totalDiscount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-500">
                  Total estimado{hasVariableWeight ? " *" : ""}
                </span>
                {hasVariableWeight && (
                  <p className="text-[10px] text-slate-400 mt-0.5">* Recalculado após pesagem dos itens variáveis</p>
                )}
              </div>
              <span className="text-xl font-bold text-slate-900 tabular-nums">{BRL(estimatedTotal)}</span>
            </div>
          </div>
        </SectionCard>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="size-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

      </form>

      {/* ── Totalizador sticky ── */}
      <div className="fixed bottom-0 left-16 right-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center gap-6">

            {/* Resumo financeiro */}
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Total estimado</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums leading-none">{BRL(estimatedTotal)}</p>
              </div>

              {totalDiscount > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Desconto</p>
                  <p className="text-sm font-semibold text-green-600 tabular-nums leading-none">-{BRL(totalDiscount)}</p>
                </div>
              )}

              {/* Status de crédito */}
              {creditoDisponivel !== null && (
                <div className="hidden sm:block">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Crédito disponível</p>
                  {exceedsCredit ? (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="size-3.5 text-red-500 shrink-0" />
                      <p className="text-sm font-semibold text-red-600 tabular-nums leading-none">{BRL(creditoDisponivel)}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                      <p className="text-sm font-semibold text-green-600 tabular-nums leading-none">{BRL(creditoDisponivel)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Aviso de peso variável */}
              {hasVariableWeight && (
                <p className="text-[10px] text-amber-600 hidden md:block">
                  * Total recalculado após pesagem
                </p>
              )}
            </div>

            {/* Alertas + Ações */}
            <div className="flex items-center gap-3 shrink-0">
              {exceedsCredit && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg hidden sm:flex">
                  <TrendingUp className="size-3.5" />
                  Excede o crédito disponível
                </div>
              )}
              <LinkButton href="/pedidos" variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9">
                Cancelar
              </LinkButton>
              <Button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={pending}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold h-9"
              >
                {pending ? "Criando..." : "Criar pedido"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
