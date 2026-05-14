import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import { OrderPipeline } from "@/components/order-pipeline"
import { OrderWeightsForm } from "@/components/order-weights-form"
import { OrderHistory } from "@/components/order-history"
import { ChevronLeft, ChevronRight, User, MapPin, Phone, ClipboardCheck, Zap, FileDown } from "lucide-react"
import { OrderConditionsEditor } from "@/components/order-conditions-editor"
import { OrderItemsEditor } from "@/components/order-items-editor"
import { ShareOrderModal } from "@/components/orders/share-order-modal"
import { OrderFinancialSection } from "@/components/financial/order-financial-section"
import { OrderMarginPanel } from "@/components/orders/order-margin-panel"
import { OrderTasks } from "@/components/orders/order-tasks"
import { OrderAttachments } from "@/components/orders/order-attachments"
import { CustomerIntelCard } from "@/components/orders/customer-intel-card"
import { OrderSlaCard } from "@/components/orders/order-sla-card"
import { getTenantVendedores } from "@/lib/queries"

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

  const [
    { data: order },
    { data: items },
    { data: history },
    { data: existingLink },
    { data: receivables },
    { data: finConfig },
    { data: tasks },
    { data: attachments },
    vendedores,
  ] = await Promise.all([
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
        profiles!orders_owner_id_fkey ( full_name, email, commission_pct )
      `)
      .eq("id", id)
      .eq("tenant_id", session!.user.tenantId)
      .single(),
    supabaseAdmin
      .from("order_items")
      .select(`
        id, requested_quantity, actual_weight, unit_price, subtotal,
        discount_pct, discount_amount, item_notes, preco_custo_snapshot,
        products ( nome, sku, unidade_medida, metadata, preco_custo )
      `)
      .eq("order_id", id),
    supabaseAdmin
      .from("order_status_history")
      .select("id, from_status, to_status, notes, created_at, profiles ( full_name, email )")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("order_links")
      .select("id, token, expires_at, views, revoked, created_at")
      .eq("order_id", id)
      .eq("tenant_id", session!.user.tenantId)
      .eq("revoked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("accounts_receivable")
      .select("id, description, amount, paid_amount, due_date, paid_at, status, installment_seq, installment_total")
      .eq("origin_type", "order")
      .eq("origin_id", id)
      .eq("tenant_id", session!.user.tenantId)
      .order("installment_seq", { ascending: true, nullsFirst: true })
      .order("due_date", { ascending: true }),
    supabaseAdmin
      .from("tenant_financial_config")
      .select("auto_generate_receivables")
      .eq("tenant_id", session!.user.tenantId)
      .maybeSingle(),
    supabaseAdmin
      .from("order_tasks")
      .select("id, title, done, due_date, assignee_id, completed_at, assignee:profiles!order_tasks_assignee_id_fkey ( full_name, email )")
      .eq("order_id", id)
      .eq("tenant_id", session!.user.tenantId)
      .order("done", { ascending: true })
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("order_attachments")
      .select("id, file_name, file_size_bytes, mime_type, storage_path, category, description, uploaded_at")
      .eq("order_id", id)
      .eq("tenant_id", session!.user.tenantId)
      .order("uploaded_at", { ascending: false }),
    getTenantVendedores(session!.user.tenantId),
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

  // Items para o painel de margem (usa snapshot do custo; fallback para custo atual do produto)
  const itemsMargin = (items ?? []).map((i: any) => ({
    id:        i.id,
    nome:      i.products?.nome ?? "—",
    quantity:  Number(i.actual_weight ?? i.requested_quantity),
    unitPrice: Number(i.unit_price),
    cost:      i.preco_custo_snapshot != null ? Number(i.preco_custo_snapshot) : (i.products?.preco_custo != null ? Number(i.products.preco_custo) : null),
    subtotal:  Number(i.subtotal),
  }))

  const owner = (order as any).profiles
  const commissionPct = Number(owner?.commission_pct ?? 0)
  const vendedorName  = owner?.full_name ?? owner?.email ?? null

  // Cliente intel: busca pedidos anteriores + vencidos
  const customerId = (order as any).customer_id ?? null
  const [{ data: customerOrders }, { data: customerOverdueRecv }] = customerId
    ? await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("id, order_number, estimated_total_amount, final_total_amount, created_at")
          .eq("customer_id", customerId)
          .eq("tenant_id", session!.user.tenantId)
          .neq("status", "cancelado")
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("accounts_receivable")
          .select("amount, paid_amount")
          .eq("customer_id", customerId)
          .eq("tenant_id", session!.user.tenantId)
          .in("status", ["vencido", "parcial"])
          .lt("due_date", new Date().toISOString().split("T")[0]),
      ])
    : [{ data: [] }, { data: [] }]

  const allCustomerOrders = (customerOrders ?? []) as any[]
  const previousOrders    = allCustomerOrders.filter((o) => o.id !== id)
  const totalCustomerOrders = allCustomerOrders.length
  const billedRevenue       = allCustomerOrders.reduce((s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)
  const avgTicket           = totalCustomerOrders > 0 ? billedRevenue / totalCustomerOrders : 0
  const lastOrder           = previousOrders[0]
  const daysSinceLast       = lastOrder
    ? Math.floor((Date.now() - new Date(lastOrder.created_at).getTime()) / (24 * 60 * 60 * 1000))
    : null

  const totalOverdueReceivable = (customerOverdueRecv ?? []).reduce(
    (s: number, r: any) => s + (Number(r.amount) - Number(r.paid_amount ?? 0)),
    0
  )

  const previousOrdersList = previousOrders.slice(0, 5).map((o) => ({
    id:            o.id,
    order_number:  o.order_number,
    total:         Number(o.final_total_amount ?? o.estimated_total_amount ?? 0),
    created_at:    o.created_at,
  }))

  const customerName = c?.nome_fantasia || c?.razao_social || "—"

  return (
    <div className="min-h-full bg-blue-50">

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

          {/* Share + PDF actions */}
          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
            <ShareOrderModal
              orderId={id}
              orderNum={orderNum}
              existingLink={existingLink as any}
            />
            {existingLink && (
              <a
                href={`/api/pdf/${(existingLink as any).token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                title="Baixar PDF (requer link público ativo)"
              >
                <FileDown className="size-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </a>
            )}
          </div>
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

            {/* SLA & Cycle time */}
            <OrderSlaCard
              history={(history ?? []) as any}
              currentStatus={order.status}
              deliveryDate={order.delivery_date}
            />

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

            {/* Rentabilidade */}
            {isAdminOrOwner && (
              <OrderMarginPanel
                items={itemsMargin}
                totalRevenue={Number(displayTotal ?? 0)}
                totalDiscount={totalDiscount}
                commissionPct={commissionPct}
                vendedorName={vendedorName}
              />
            )}

            {/* Financeiro */}
            <OrderFinancialSection
              orderId={id}
              receivables={(receivables ?? []) as any}
              orderTotal={Number(displayTotal ?? 0)}
              autoGenEnabled={(finConfig as any)?.auto_generate_receivables ?? true}
            />

            {/* Histórico */}
            {history && history.length > 0 && (
              <OrderHistory history={history as any} />
            )}
          </div>

          {/* ── Sidebar (1/3) ── */}
          <div className="space-y-4">

            {/* Cliente Intel — comportamento histórico */}
            {customerId && isAdminOrOwner && (
              <CustomerIntelCard
                customerId={customerId}
                customerName={customerName}
                totalOrders={totalCustomerOrders}
                totalRevenue={billedRevenue}
                avgTicket={avgTicket}
                daysSinceLast={daysSinceLast}
                thisOrderTotal={Number(displayTotal ?? 0)}
                lastOrders={previousOrdersList}
                totalOverdueReceivable={totalOverdueReceivable}
              />
            )}

            {/* Tarefas/Checklist */}
            <OrderTasks
              orderId={id}
              tasks={(tasks ?? []) as any}
              vendedores={vendedores ?? []}
            />

            {/* Documentos & Anexos */}
            <OrderAttachments
              orderId={id}
              attachments={(attachments ?? []) as any}
            />

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
