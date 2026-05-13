import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { pdf } from "@react-pdf/renderer"
import { OrderPDFDocument } from "@/components/orders/order-pdf"
import { createElement } from "react"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/pdf/[token]">,
) {
  const { token } = await ctx.params

  // Fetch link
  const { data: link } = await supabaseAdmin
    .from("order_links")
    .select(`
      id, expires_at, revoked,
      orders (
        id, order_number, status, delivery_date, created_at,
        estimated_total_amount, final_total_amount,
        payment_method, payment_condition, delivery_time,
        logistics_notes, customer_po,
        customers (
          razao_social, nome_fantasia, cnpj_cpf,
          cidade, estado, comprador_nome, comprador_whatsapp
        ),
        tenants ( name )
      )
    `)
    .eq("token", token)
    .single()

  if (!link || link.revoked || new Date(link.expires_at) < new Date()) {
    return new Response("Link inválido ou expirado", { status: 404 })
  }

  const order  = (link as any).orders
  const c      = order?.customers
  const tenant = order?.tenants

  // Fetch items
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select(`
      requested_quantity, actual_weight, unit_price,
      subtotal, discount_pct, discount_amount,
      products ( nome, sku, unidade_medida, metadata )
    `)
    .eq("order_id", order.id)

  const pdfData = {
    orderNumber:         Number(order.order_number),
    status:              order.status,
    createdAt:           order.created_at,
    deliveryDate:        order.delivery_date ?? null,
    deliveryTime:        order.delivery_time ?? null,
    paymentMethod:       order.payment_method ?? null,
    paymentCondition:    order.payment_condition ?? null,
    customerPo:          order.customer_po ?? null,
    logisticsNotes:      order.logistics_notes ?? null,
    estimatedTotal:      Number(order.estimated_total_amount),
    finalTotal:          order.final_total_amount ? Number(order.final_total_amount) : null,
    tenantName:          tenant?.name ?? "",
    customerRazaoSocial: c?.razao_social ?? "",
    customerNomeFantasia: c?.nome_fantasia ?? null,
    customerCnpj:        c?.cnpj_cpf ?? null,
    customerCidade:      c?.cidade ?? null,
    customerEstado:      c?.estado ?? null,
    compradorNome:       c?.comprador_nome ?? null,
    compradorWhatsapp:   c?.comprador_whatsapp ?? null,
    expiresAt:           link.expires_at,
    items: (items ?? []).map((i: any) => ({
      nome:               i.products?.nome ?? "—",
      sku:                i.products?.sku ?? null,
      unidade:            i.products?.unidade_medida ?? "un",
      qty:                Number(i.actual_weight ?? i.requested_quantity),
      unitPrice:          Number(i.unit_price),
      subtotal:           Number(i.subtotal),
      discountPct:        Number(i.discount_pct ?? 0),
      discountAmount:     Number(i.discount_amount ?? 0),
      vendaPesoVariavel:  i.products?.metadata?.venda_peso_variavel ?? false,
    })),
  }

  const orderNum = String(pdfData.orderNumber).padStart(4, "0")

  const blob   = await pdf(createElement(OrderPDFDocument, { data: pdfData })).toBlob()
  const buffer = await blob.arrayBuffer()

  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="pedido-${orderNum}.pdf"`,
      "Cache-Control":       "no-store",
    },
  })
}
