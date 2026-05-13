import { supabaseAdmin } from "@/lib/supabase"
import { FileDown, Clock, CheckCircle2, Package } from "lucide-react"
import Link from "next/link"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_LONG = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  recebido:                { label: "Recebido",              color: "text-blue-700 bg-blue-50 border-blue-200",   dot: "bg-blue-500"   },
  em_separacao:            { label: "Em Separação",          color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500"  },
  aguardando_faturamento:  { label: "Ag. Faturamento",       color: "text-violet-700 bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  faturado:                { label: "Faturado",              color: "text-indigo-700 bg-indigo-50 border-indigo-200", dot: "bg-indigo-500" },
  em_rota:                 { label: "Em Rota",               color: "text-cyan-700 bg-cyan-50 border-cyan-200",   dot: "bg-cyan-500"   },
  entregue:                { label: "Entregue",              color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500"  },
  cancelado:               { label: "Cancelado",             color: "text-red-700 bg-red-50 border-red-200",      dot: "bg-red-500"    },
}

export default async function PublicOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Fetch link + order + customer + tenant in one go
  const { data: link } = await supabaseAdmin
    .from("order_links")
    .select(`
      id, token, expires_at, views, revoked,
      orders (
        id, order_number, status, delivery_date, created_at,
        estimated_total_amount, final_total_amount,
        payment_method, payment_condition, delivery_time,
        delivery_address, logistics_notes, customer_po,
        customers (
          razao_social, nome_fantasia, cnpj_cpf,
          cidade, estado, bairro, logradouro, numero,
          comprador_nome, comprador_whatsapp, email_financeiro
        ),
        tenants ( name )
      )
    `)
    .eq("token", token)
    .single()

  // Validate
  const isRevoked  = link?.revoked
  const isExpired  = link ? new Date(link.expires_at) < new Date() : true
  const isInvalid  = !link || isRevoked || isExpired

  if (isInvalid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-12 max-w-md w-full text-center">
          <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <Clock className="size-7 text-slate-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">
            {isRevoked ? "Link revogado" : "Link expirado"}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Este documento não está mais disponível.<br />
            Entre em contato com o emissor para solicitar um novo link.
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-6">Powered by PedidosPro</p>
      </div>
    )
  }

  // Increment view count (fire-and-forget)
  supabaseAdmin
    .from("order_links")
    .update({ views: (link.views ?? 0) + 1 })
    .eq("id", link.id)

  const order    = (link as any).orders
  const c        = order?.customers
  const tenant   = order?.tenants
  const orderNum = String(order?.order_number ?? 0).padStart(4, "0")
  const status   = STATUS_MAP[order?.status] ?? { label: order?.status, color: "text-slate-600 bg-slate-100 border-slate-200", dot: "bg-slate-400" }
  const display  = order?.final_total_amount ?? order?.estimated_total_amount
  const isFinal  = !!order?.final_total_amount
  const expDate  = new Date(link.expires_at).toLocaleDateString("pt-BR")

  // Fetch items
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select(`
      id, requested_quantity, actual_weight, unit_price,
      subtotal, discount_pct, discount_amount,
      products ( nome, sku, unidade_medida )
    `)
    .eq("order_id", order.id)

  const tenantInitial = (tenant?.name ?? "P")[0].toUpperCase()
  const customerName  = c?.nome_fantasia || c?.razao_social

  const totalDiscount = (items ?? []).reduce((s: number, i: any) => s + Number(i.discount_amount ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Accent strip */}
      <div className="h-1 bg-blue-600 w-full" />

      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Tenant + Order row */}
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            {/* Tenant branding */}
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-base font-bold text-white">{tenantInitial}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{tenant?.name ?? "—"}</p>
                <p className="text-xs text-slate-400">Documento comercial</p>
              </div>
            </div>

            {/* Order number + status */}
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-slate-900 tabular-nums">#{orderNum}</p>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border mt-1 ${status.color}`}>
                <span className={`size-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Customer + details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:divide-x sm:divide-slate-100">

            {/* Left: Customer */}
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Para</p>
              <p className="text-sm font-semibold text-slate-900 mb-0.5">{customerName}</p>
              {c?.cnpj_cpf && (
                <p className="text-xs font-mono text-slate-400 mb-3">{c.cnpj_cpf}</p>
              )}
              {(c?.cidade || c?.estado) && (
                <p className="text-xs text-slate-500 mb-3">
                  {[c.cidade, c.estado].filter(Boolean).join(" — ")}
                </p>
              )}
              {c?.comprador_nome && (
                <p className="text-xs text-slate-600 font-medium">{c.comprador_nome}</p>
              )}
              {c?.comprador_whatsapp && (
                <p className="text-xs text-slate-400">{c.comprador_whatsapp}</p>
              )}
            </div>

            {/* Right: Order details */}
            <div className="px-6 py-5 border-t sm:border-t-0 border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Detalhes</p>
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Emissão</span>
                  <span className="text-xs font-medium text-slate-700">{DATE_SHORT(order.created_at.split("T")[0])}</span>
                </div>
                {order?.delivery_date && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Entrega</span>
                    <span className="text-xs font-semibold text-slate-900">{DATE_SHORT(order.delivery_date)}</span>
                  </div>
                )}
                {order?.delivery_time && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Turno</span>
                    <span className="text-xs text-slate-700">{order.delivery_time}</span>
                  </div>
                )}
                {order?.payment_condition && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Pagamento</span>
                    <span className="text-xs text-slate-700">{order.payment_condition}</span>
                  </div>
                )}
                {order?.payment_method && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Forma</span>
                    <span className="text-xs text-slate-700">{order.payment_method}</span>
                  </div>
                )}
                {order?.customer_po && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">PO</span>
                    <span className="text-xs font-mono text-slate-700">{order.customer_po}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Package className="size-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">Itens do pedido</p>
            <span className="ml-auto text-[11px] text-slate-400">{items?.length ?? 0} {(items?.length ?? 0) === 1 ? "item" : "itens"}</span>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_60px_80px_100px_110px] gap-3 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Produto</span>
            <span className="text-center">Unid.</span>
            <span className="text-right">Qtd.</span>
            <span className="text-right">Unit.</span>
            <span className="text-right">Subtotal</span>
          </div>

          {/* Rows */}
          {(items ?? []).map((item: any, i: number) => {
            const isLast = i === (items?.length ?? 0) - 1
            const qty    = item.actual_weight ?? item.requested_quantity
            return (
              <div
                key={item.id}
                className={`px-6 py-3.5 ${!isLast ? "border-b border-slate-100" : ""}`}
              >
                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[1fr_60px_80px_100px_110px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{(item as any).products?.nome}</p>
                    {(item as any).products?.sku && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{(item as any).products.sku}</p>
                    )}
                  </div>
                  <span className="text-xs text-center text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mx-auto">
                    {(item as any).products?.unidade_medida}
                  </span>
                  <p className="text-sm text-right text-slate-700 tabular-nums">{Number(qty).toLocaleString("pt-BR")}</p>
                  <p className="text-sm text-right text-slate-700 tabular-nums">{BRL(Number(item.unit_price))}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{BRL(Number(item.subtotal))}</p>
                    {Number(item.discount_pct) > 0 && (
                      <p className="text-[10px] text-green-600 mt-0.5">-{Number(item.discount_pct).toFixed(0)}% desc.</p>
                    )}
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="sm:hidden flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{(item as any).products?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {Number(qty).toLocaleString("pt-BR")} {(item as any).products?.unidade_medida} · {BRL(Number(item.unit_price))}/un
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">{BRL(Number(item.subtotal))}</p>
                </div>
              </div>
            )
          })}

          {/* Totals */}
          <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-4">
            <div className="flex flex-col items-end gap-1.5 max-w-xs ml-auto">
              {totalDiscount > 0 && (
                <div className="flex justify-between w-full">
                  <span className="text-xs text-slate-400">Descontos</span>
                  <span className="text-xs text-green-600 font-medium">- {BRL(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between w-full pt-1 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-700">
                  {isFinal ? "Total" : "Total estimado"}
                </span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{BRL(Number(display))}</span>
              </div>
              {!isFinal && (
                <p className="text-[10px] text-slate-400 text-right">
                  Valor sujeito a ajuste após pesagem
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {order?.logistics_notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-1.5">Observações</p>
            <p className="text-sm text-amber-900 leading-relaxed">{order.logistics_notes}</p>
          </div>
        )}

        {/* Actions + footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 order-2 sm:order-1">
            <CheckCircle2 className="size-3.5 text-slate-300" />
            <span>Válido até {expDate}</span>
            <span className="text-slate-200">·</span>
            <span>{link.views} {link.views === 1 ? "visualização" : "visualizações"}</span>
          </div>

          <a
            href={`/api/pdf/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="order-1 sm:order-2 inline-flex items-center gap-2 h-9 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <FileDown className="size-4" />
            Baixar PDF
          </a>
        </div>

        <p className="text-center text-[11px] text-slate-300 pb-6">
          Gerado por PedidosPro · Documento de uso comercial
        </p>
      </div>
    </div>
  )
}
