import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface Installment { days: number; pct: number }

/**
 * Parser de condicao_pagamento textual → array de parcelas.
 * Suporta:
 *   "A vista"          → [{ days: 0,  pct: 100 }]
 *   "30 dias"          → [{ days: 30, pct: 100 }]
 *   "2x 30/60"         → [{ days: 30, pct: 50  }, { days: 60, pct: 50 }]
 *   "3x 30/60/90"      → 3 parcelas iguais
 */
function parsePaymentCondition(cond: string | null | undefined): Installment[] {
  if (!cond) return [{ days: 0, pct: 100 }]
  const c = cond.toLowerCase().trim()
  if (c.includes("vista")) return [{ days: 0, pct: 100 }]

  // Parcelado: "Nx D1/D2/D3"
  const parc = c.match(/(\d+)x\s+(\d+(?:\/\d+)+)/i)
  if (parc) {
    const days = parc[2].split("/").map((d) => parseInt(d, 10)).filter((n) => !isNaN(n))
    if (days.length > 0) {
      const pct = 100 / days.length
      return days.map((d) => ({ days: d, pct }))
    }
  }

  // Single: "30 dias"
  const single = c.match(/(\d+)\s*dias?/)
  if (single) {
    const d = parseInt(single[1], 10)
    if (!isNaN(d)) return [{ days: d, pct: 100 }]
  }

  return [{ days: 0, pct: 100 }]
}

/**
 * Gera contas a receber a partir de um pedido se:
 *   - auto-geração está habilitada no tenant
 *   - o status atual do pedido bate com o trigger_status configurado
 *   - ainda não existem recebimentos com origin_id = orderId
 *
 * Idempotente — pode ser chamada múltiplas vezes sem duplicar.
 */
export async function generateReceivablesFromOrder(
  orderId: string,
  newStatus: string,
  userId: string,
) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(`
      id, tenant_id, customer_id, order_number,
      final_total_amount, estimated_total_amount, payment_method,
      customers ( condicao_pagamento )
    `)
    .eq("id", orderId)
    .single()

  if (!order) return

  // Config do tenant
  const { data: config } = await supabaseAdmin
    .from("tenant_financial_config")
    .select("auto_generate_receivables, trigger_status, default_payment_method, default_bank_account_id")
    .eq("tenant_id", order.tenant_id)
    .maybeSingle()

  if (!config?.auto_generate_receivables) return
  if (config.trigger_status !== newStatus) return

  // Idempotência
  const { count } = await supabaseAdmin
    .from("accounts_receivable")
    .select("id", { count: "exact", head: true })
    .eq("origin_type", "order")
    .eq("origin_id", orderId)

  if ((count ?? 0) > 0) return

  const total = Number(order.final_total_amount ?? order.estimated_total_amount ?? 0)
  if (total <= 0) return

  const customer     = order.customers as any
  const installments = parsePaymentCondition(customer?.condicao_pagamento)

  // Categoria padrão "Venda de Mercadoria"
  const { data: defaultCategory } = await supabaseAdmin
    .from("financial_categories")
    .select("id")
    .eq("tenant_id", order.tenant_id)
    .eq("type", "receita")
    .eq("name", "Venda de Mercadoria")
    .maybeSingle()

  const orderNum = String(order.order_number).padStart(4, "0")
  const today    = new Date()

  // Distribui valor com arredondamento (última parcela absorve o resto)
  const rows = installments.map((inst, i) => {
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + inst.days)

    let amount = Math.round(total * inst.pct) / 100 * 100 / 100  // 2 decimals
    amount = +(total * inst.pct / 100).toFixed(2)

    return {
      tenant_id:         order.tenant_id,
      customer_id:       order.customer_id,
      category_id:       defaultCategory?.id ?? null,
      origin_type:       "order" as const,
      origin_id:         orderId,
      description:       installments.length > 1
        ? `Pedido #${orderNum} — parcela ${i + 1}/${installments.length}`
        : `Pedido #${orderNum}`,
      installment_seq:   installments.length > 1 ? i + 1 : null,
      installment_total: installments.length > 1 ? installments.length : null,
      amount,
      due_date:          dueDate.toISOString().split("T")[0],
      payment_method:    order.payment_method ?? config.default_payment_method ?? null,
      created_by:        userId,
    }
  })

  // Ajusta arredondamento na última parcela
  if (rows.length > 1) {
    const sumAll  = rows.reduce((s, r) => s + r.amount, 0)
    const diff    = +(total - sumAll).toFixed(2)
    if (diff !== 0) rows[rows.length - 1].amount = +(rows[rows.length - 1].amount + diff).toFixed(2)
  }

  await supabaseAdmin.from("accounts_receivable").insert(rows)

  revalidatePath("/financeiro")
  revalidatePath("/financeiro/recebimentos")
}

/**
 * Cancela todos os recebimentos abertos/parciais/vencidos vinculados a um pedido.
 * Não toca em recebimentos já pagos — eles representam dinheiro real recebido.
 */
export async function cancelReceivablesFromOrder(orderId: string) {
  await supabaseAdmin
    .from("accounts_receivable")
    .update({ status: "cancelado", updated_at: new Date().toISOString() })
    .eq("origin_type", "order")
    .eq("origin_id", orderId)
    .in("status", ["aberto", "parcial", "vencido"])

  revalidatePath("/financeiro/recebimentos")
}
