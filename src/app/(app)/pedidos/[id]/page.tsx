import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import { OrderPipeline } from "@/components/order-pipeline"
import { OrderWeightsForm } from "@/components/order-weights-form"
import { OrderHistory } from "@/components/order-history"
import { ChevronLeft, ChevronRight, User, MapPin, Phone, ClipboardCheck, Zap } from "lucide-react"
import { OrderConditionsEditor } from "@/components/order-conditions-editor"
import { OrderItemsEditor } from "@/components/order-items-editor"

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }         = await params
  const session        = await auth()
  const isAdminOrOwner = ["owner", "admin"].includes(session!.user.role)

  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select(`
        id, status, order_number, delivery_date, estimated_total_amount, final_total_amount,
        logistics_notes, created_at, owner_id,
        payment_method, payment_condition, delivery_time, delivery_address,
        customers (
          razao_social, nome_fantasia, cnpj_cpf,
          comprador_nome, comprador_whatsapp, email_financeiro,
          rota_entrega, logradouro, numero, complemento, bairro, cep, cidade, estado,
          condicao_pagamento, tabela_preco
        ),
        profiles!orders_owner_id_fkey ( full_name, email )
      `)
      .eq("id", id)
      .eq("tenant_id", session!.user.tenantId)
      .single(),
    supabaseAdmin
      .from("order_items")
      .select(`
        id, requested_quantity, actual_weight, unit_price, subtotal,
        discount_pct, discount_amount, item_notes,
        products ( nome, sku, unidade_medida, metadata )
      `)
      .eq("order_id", id),
    supabaseAdmin
      .from("order_status_history")
      .select("id, from_status, to_status, notes, created_at, profiles ( full_name, email )")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (!order) notFound()

  const canEdit     = isAdminOrOwner || order.owner_id === session!.user.id
  const isSeparacao = order.status === "em_separacao"
  const c           = (order as any).customers

  const formattedItems = (items ?? []).map((i: any) => ({
    id:                  i.id,
    product_nome:        i.products?.nome ?? "—",
    product_sku:         i.products?.sku  ?? null,
    requested_quantity:  Number(i.requested_quantity),
    actual_weight:       i.actual_weight != null ? Number(i.actual_weight) : null,
    unit_price:          Number(i.unit_price),
    subtotal:            Number(i.subtotal),
    discount_pct:        Number(i.discount_pct  ?? 0),
    discount_amount:     Number(i.discount_amount ?? 0),
    item_notes:          i.item_notes ?? null,
    unidade_medida:      i.products?.unidade_medida ?? "un",
    venda_peso_variavel: i.products?.metadata?.venda_peso_variavel ?? false,
  }))

  const hasVariableWeight = formattedItems.some((i) => i.venda_peso_variavel)
  const displayTotal      = order.final_total_amount ?? order.estimated_total_amount
  const isFinal           = order.final_total_amount != null
  const totalDiscount     = formattedItems.reduce((s, i) => s + i.discount_amount, 0)

  const orderNum     = String((order as any).order_number ?? 0).padStart(4, "0")
  const nomeExibicao = c?.nome_fantasia || c?.razao_social

  return (
    <div className="min-h-full bg-slate-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton href="/pedidos" variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 shrink-0">
          <ChevronLeft className="size-4 text-slate-600" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 shrink-0">Pedidos</span>
          <ChevronRight className="size-3.5 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-900 truncate">#{orderNum}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {(order as any).priority === "urgente" && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
              <Zap className="size-3" /> URGENTE
            </span>
          )}
          {(order as any).customer_po && (
            <span className="text-xs text-slate-400 font-mono hidden sm:block">
              PO: {(order as any).customer_po}
            </span>
          )}
          <StatusBadge status={order.status} className="text-[11px] font-semibold px-2.5 py-1 rounded-md" />
          <span className="text-xs text-slate-400 hidden sm:block">
            {DATE_SHORT(order.created_at.split("T")[0])}
          </span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* Banner de pesagem pendente */}
        {isSeparacao && hasVariableWeight && canEdit && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
            <div className="size-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardCheck className="size-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 mb-0.5">Pesagem pendente</p>
              <p className="text-xs text-amber-700 mb-4">Ajuste os pesos reais dos itens variáveis antes de faturar.</p>
              <OrderWeightsForm orderId={id} items={formattedItems} />
            </div>
          </div>
        )}

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Coluna principal (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Pipeline */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Progresso do pedido
              </p>
              <OrderPipeline
                orderId={id}
                status={order.status}
                userRole={session!.user.role}
                canEdit={canEdit}
              />
            </div>

            {/* Itens */}
            <OrderItemsEditor
              orderId={id}
              status={order.status}
              canEdit={canEdit}
              items={formattedItems}
              isFinal={isFinal}
              displayTotal={displayTotal}
              estimatedTotal={order.estimated_total_amount}
              totalDiscount={totalDiscount}
            />

            {/* Histórico */}
            {history && history.length > 0 && (
              <OrderHistory history={history as any} />
            )}
          </div>

          {/* ── Sidebar (1/3) ── */}
          <div className="space-y-4">

            {/* Cliente */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Cliente</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-600">{nomeExibicao?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{nomeExibicao}</p>
                  {c?.cnpj_cpf && (
                    <p className="text-xs font-mono text-slate-400 truncate">{c.cnpj_cpf}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                {c?.comprador_nome && (
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{c.comprador_nome}</span>
                  </div>
                )}
                {c?.comprador_whatsapp && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700">{c.comprador_whatsapp}</span>
                  </div>
                )}
                {c?.logradouro && (
                  <div className="flex items-start gap-2">
                    <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700">
                        {c.logradouro}{c.numero ? `, ${c.numero}` : ""}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[c.bairro, c.cidade, c.estado].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Logística */}
            <OrderConditionsEditor
              orderId={id}
              status={order.status}
              canEdit={canEdit}
              deliveryDate={order.delivery_date}
              deliveryTime={(order as any).delivery_time}
              deliveryAddress={(order as any).delivery_address}
              paymentMethod={(order as any).payment_method}
              paymentCondition={(order as any).payment_condition}
              logisticsNotes={order.logistics_notes}
              rotaEntrega={c?.rota_entrega}
            />

            {/* Responsável */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Responsável</p>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-600">
                    {((order as any).profiles?.full_name ?? (order as any).profiles?.email ?? "?")[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {(order as any).profiles?.full_name ?? (order as any).profiles?.email ?? "—"}
                </p>
              </div>
            </div>

            {/* Condições comerciais */}
            {(c?.condicao_pagamento || c?.tabela_preco) && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Condições comerciais
                </p>
                <div className="space-y-3">
                  {c?.condicao_pagamento && (
                    <InfoRow label="Pagamento" value={c.condicao_pagamento} />
                  )}
                  {c?.tabela_preco && (
                    <InfoRow label="Tabela" value={c.tabela_preco} />
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
