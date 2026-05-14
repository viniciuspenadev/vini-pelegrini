"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  generateReceivablesFromOrder,
  cancelReceivablesFromOrder,
} from "@/lib/financial/generate-receivables"

export interface OrderItemInput {
  product_id:         string
  requested_quantity: number
  unit_price:         number
  discount_pct?:      number
  discount_amount?:   number
  item_notes?:        string
}

export async function createOrder(data: {
  customer_id:       string
  delivery_date:     string
  logistics_notes?:  string
  payment_method?:   string
  payment_condition?: string
  delivery_time?:    string
  delivery_address?: string
  customer_po?:      string
  priority?:         string
  items:             OrderItemInput[]
}) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  // Gera número sequencial por tenant (atomic increment)
  const { data: tenant, error: tErr } = await supabaseAdmin
    .from("tenants")
    .update({ order_counter: supabaseAdmin.rpc("increment_order_counter" as any) as any })
    .eq("id", session.user.tenantId)
    .select("order_counter")
    .single()

  // Fallback: busca o counter atual e incrementa manualmente
  let orderNumber = 1
  if (tErr || !tenant) {
    const { data: t } = await supabaseAdmin
      .from("tenants")
      .select("order_counter")
      .eq("id", session.user.tenantId)
      .single()
    orderNumber = (t?.order_counter ?? 0) + 1
    await supabaseAdmin
      .from("tenants")
      .update({ order_counter: orderNumber })
      .eq("id", session.user.tenantId)
  } else {
    orderNumber = tenant.order_counter
  }

  const estimated_total_amount = data.items.reduce((sum, item) => {
    const gross    = item.requested_quantity * item.unit_price
    const discount = item.discount_amount ?? (gross * (item.discount_pct ?? 0) / 100)
    return sum + gross - discount
  }, 0)

  // Usa o vendedor responsável pelo cliente como owner; fallback para o usuário atual
  const { data: customerData } = await supabaseAdmin
    .from("customers")
    .select("vendedor_id")
    .eq("id", data.customer_id)
    .eq("tenant_id", session.user.tenantId)
    .single()
  const owner_id = customerData?.vendedor_id ?? session.user.id

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .insert({
      tenant_id:             session.user.tenantId,
      customer_id:           data.customer_id,
      owner_id,
      created_by:            session.user.id,
      order_number:          orderNumber,
      delivery_date:         data.delivery_date,
      logistics_notes:       data.logistics_notes || null,
      payment_method:        data.payment_method  || null,
      payment_condition:     data.payment_condition || null,
      delivery_time:         data.delivery_time    || null,
      delivery_address:      data.delivery_address || null,
      customer_po:           data.customer_po      || null,
      priority:              data.priority         || "normal",
      estimated_total_amount,
    })
    .select("id")
    .single()

  if (error || !order) throw new Error(error?.message ?? "Erro ao criar pedido")

  // Captura snapshot do preço de custo dos produtos no momento do pedido
  const productIds = data.items.map((i) => i.product_id)
  const { data: productsCusto } = await supabaseAdmin
    .from("products")
    .select("id, preco_custo")
    .in("id", productIds)
  const custoMap = new Map((productsCusto ?? []).map((p) => [p.id, p.preco_custo]))

  const items = data.items.map((item) => {
    const gross          = item.requested_quantity * item.unit_price
    const discount_amount = item.discount_amount ?? (gross * (item.discount_pct ?? 0) / 100)
    return {
      order_id:             order.id,
      product_id:           item.product_id,
      requested_quantity:   item.requested_quantity,
      unit_price:           item.unit_price,
      discount_pct:         item.discount_pct   ?? 0,
      discount_amount:      discount_amount,
      item_notes:           item.item_notes     ?? null,
      subtotal:             gross - discount_amount,
      preco_custo_snapshot: custoMap.get(item.product_id) ?? null,
    }
  })

  const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(items)
  if (itemsErr) throw new Error(itemsErr.message)

  // Registra criação no histórico
  await supabaseAdmin.from("order_status_history").insert({
    order_id:   order.id,
    from_status: null,
    to_status:  "recebido",
    changed_by: session.user.id,
    notes:      "Pedido criado",
  })

  revalidatePath("/pedidos")
  redirect(`/pedidos/${order.id}`)
}

// Quem pode avançar cada status
const STATUS_ALLOWED_ROLES: Record<string, string[]> = {
  recebido:               ["owner", "admin", "vendedor", "financeiro"],
  em_separacao:           ["owner", "admin", "vendedor", "financeiro"],
  aguardando_faturamento: ["owner", "admin", "financeiro"],
  faturado:               ["owner", "admin", "financeiro"],
  em_rota:                ["owner", "admin", "financeiro"],
}

const NEXT_STATUS: Record<string, string> = {
  recebido:               "em_separacao",
  em_separacao:           "aguardando_faturamento",
  aguardando_faturamento: "faturado",
  faturado:               "em_rota",
  em_rota:                "entregue",
}

const STATUS_NOTES: Record<string, string> = {
  em_separacao:           "Separação iniciada",
  aguardando_faturamento: "Pesagem confirmada — aguardando faturamento",
  faturado:               "Faturamento confirmado",
  em_rota:                "Saiu para entrega",
  entregue:               "Entrega confirmada",
}

export async function advanceOrderStatus(orderId: string, notes?: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!order) throw new Error("Pedido não encontrado")

  const next         = NEXT_STATUS[order.status]
  const allowedRoles = STATUS_ALLOWED_ROLES[order.status] ?? []

  if (!next) throw new Error("Pedido já finalizado")
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Sem permissão para avançar este status")
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: next })
    .eq("id", orderId)

  if (error) throw new Error(error.message)

  await supabaseAdmin.from("order_status_history").insert({
    order_id:    orderId,
    from_status: order.status,
    to_status:   next,
    changed_by:  session.user.id,
    notes:       notes || STATUS_NOTES[next] || null,
  })

  // Hook financeiro: gera recebimentos se o novo status for o trigger configurado
  await generateReceivablesFromOrder(orderId, next, session.user.id)

  revalidatePath(`/pedidos/${orderId}`)
  revalidatePath("/pedidos")
}

// Ação específica: operador solicita faturamento após pesagem confirmada
export async function requestBilling(orderId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!order) throw new Error("Pedido não encontrado")
  if (order.status !== "em_separacao") throw new Error("Pedido não está em separação")

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: "aguardando_faturamento" })
    .eq("id", orderId)

  if (error) throw new Error(error.message)

  await supabaseAdmin.from("order_status_history").insert({
    order_id:    orderId,
    from_status: "em_separacao",
    to_status:   "aguardando_faturamento",
    changed_by:  session.user.id,
    notes:       "Pesagem confirmada — enviado para faturamento",
  })

  // Hook financeiro
  await generateReceivablesFromOrder(orderId, "aguardando_faturamento", session.user.id)

  revalidatePath(`/pedidos/${orderId}`)
  revalidatePath("/pedidos")
}

export async function cancelOrder(orderId: string, notes?: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!order) throw new Error("Pedido não encontrado")

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelado" })
    .eq("id", orderId)

  if (error) throw new Error(error.message)

  await supabaseAdmin.from("order_status_history").insert({
    order_id:    orderId,
    from_status: order.status,
    to_status:   "cancelado",
    changed_by:  session.user.id,
    notes:       notes || "Pedido cancelado",
  })

  // Hook financeiro: cancela recebimentos abertos vinculados a este pedido
  await cancelReceivablesFromOrder(orderId)

  revalidatePath(`/pedidos/${orderId}`)
  revalidatePath("/pedidos")
}

export async function saveActualWeights(
  orderId: string,
  weights: { itemId: string; actualWeight: number }[]
) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  for (const { itemId, actualWeight } of weights) {
    const { data: item } = await supabaseAdmin
      .from("order_items")
      .select("unit_price, discount_amount")
      .eq("id", itemId)
      .single()

    if (!item) continue

    const gross   = actualWeight * Number(item.unit_price)
    const subtotal = gross - Number(item.discount_amount ?? 0)

    await supabaseAdmin
      .from("order_items")
      .update({ actual_weight: actualWeight, subtotal })
      .eq("id", itemId)
  }

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("subtotal")
    .eq("order_id", orderId)

  const finalTotal = items?.reduce((sum, it) => sum + Number(it.subtotal), 0) ?? 0

  await supabaseAdmin
    .from("orders")
    .update({ final_total_amount: finalTotal })
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath(`/pedidos/${orderId}`)
}

export async function updateOrderConditions(
  orderId: string,
  data: {
    payment_method?:    string | null
    payment_condition?: string | null
    delivery_date?:     string | null
    delivery_time?:     string | null
    delivery_address?:  string | null
    logistics_notes?:   string | null
  }
) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status, payment_method, payment_condition, delivery_date, delivery_time, delivery_address, logistics_notes")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!order) throw new Error("Pedido não encontrado")
  if (["cancelado", "entregue"].includes(order.status)) throw new Error("Pedido finalizado, edição bloqueada")

  const fieldLabels: Array<[string, keyof typeof data]> = [
    ["Pagamento",           "payment_method"],
    ["Condição",            "payment_condition"],
    ["Data de entrega",     "delivery_date"],
    ["Hora",                "delivery_time"],
    ["Endereço alternativo","delivery_address"],
    ["Observações",         "logistics_notes"],
  ]

  const changes: string[] = []
  for (const [label, key] of fieldLabels) {
    const oldVal = String((order as any)[key] ?? "")
    const newVal = String(data[key] ?? "")
    if (oldVal !== newVal) changes.push(`${label}: "${newVal || "—"}"`)
  }

  await supabaseAdmin
    .from("orders")
    .update({
      payment_method:    data.payment_method    ?? null,
      payment_condition: data.payment_condition ?? null,
      delivery_date:     data.delivery_date     ?? null,
      delivery_time:     data.delivery_time     ?? null,
      delivery_address:  data.delivery_address  ?? null,
      logistics_notes:   data.logistics_notes   ?? null,
    })
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)

  if (changes.length > 0) {
    await supabaseAdmin.from("order_status_history").insert({
      order_id:    orderId,
      from_status: order.status,
      to_status:   order.status,
      changed_by:  session.user.id,
      notes:       `Condições alteradas — ${changes.join("; ")}`,
    })
  }

  revalidatePath(`/pedidos/${orderId}`)
}

export async function updateOrderItems(
  orderId: string,
  updates: Array<{
    id:                 string
    requested_quantity: number
    unit_price:         number
    discount_pct:       number
    item_notes?:        string | null
  }>
) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!order) throw new Error("Pedido não encontrado")
  if (!["recebido", "em_separacao"].includes(order.status))
    throw new Error("Itens não podem ser editados neste status")

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const changeNotes: string[] = []

  for (const item of updates) {
    const { data: current } = await supabaseAdmin
      .from("order_items")
      .select("requested_quantity, unit_price, discount_pct, products(nome)")
      .eq("id", item.id)
      .single()

    const gross           = item.requested_quantity * item.unit_price
    const discount_amount = gross * (item.discount_pct / 100)
    const subtotal        = gross - discount_amount

    await supabaseAdmin
      .from("order_items")
      .update({ requested_quantity: item.requested_quantity, unit_price: item.unit_price, discount_pct: item.discount_pct, discount_amount, subtotal, item_notes: item.item_notes ?? null })
      .eq("id", item.id)

    if (current) {
      const nome  = (current.products as any)?.nome ?? "Item"
      const diffs: string[] = []
      if (Number(current.requested_quantity) !== item.requested_quantity)
        diffs.push(`qty: ${Number(current.requested_quantity)} → ${item.requested_quantity}`)
      if (Number(current.unit_price) !== item.unit_price)
        diffs.push(`preço: ${fmt(Number(current.unit_price))} → ${fmt(item.unit_price)}`)
      if (Number(current.discount_pct) !== item.discount_pct)
        diffs.push(`desc: ${Number(current.discount_pct)}% → ${item.discount_pct}%`)
      if (diffs.length > 0) changeNotes.push(`${nome} (${diffs.join(", ")})`)
    }
  }

  const { data: allItems } = await supabaseAdmin
    .from("order_items").select("subtotal").eq("order_id", orderId)

  const estimated = allItems?.reduce((s, i) => s + Number(i.subtotal), 0) ?? 0
  await supabaseAdmin
    .from("orders")
    .update({ estimated_total_amount: estimated })
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)

  await supabaseAdmin.from("order_status_history").insert({
    order_id:    orderId,
    from_status: order.status,
    to_status:   order.status,
    changed_by:  session.user.id,
    notes:       changeNotes.length > 0
      ? `Itens alterados — ${changeNotes.join("; ")}`
      : "Itens do pedido atualizados",
  })

  revalidatePath(`/pedidos/${orderId}`)
}

export async function duplicateOrder(orderId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: original } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!original) throw new Error("Pedido não encontrado")

  // Gera novo número sequencial
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("order_counter")
    .eq("id", session.user.tenantId)
    .single()

  const orderNumber = (tenant?.order_counter ?? 0) + 1
  await supabaseAdmin
    .from("tenants")
    .update({ order_counter: orderNumber })
    .eq("id", session.user.tenantId)

  const { data: newOrder, error } = await supabaseAdmin
    .from("orders")
    .insert({
      tenant_id:             session.user.tenantId,
      customer_id:           original.customer_id,
      owner_id:              session.user.id,
      created_by:            session.user.id,
      order_number:          orderNumber,
      delivery_date:         original.delivery_date,
      logistics_notes:       original.logistics_notes,
      payment_method:        original.payment_method,
      payment_condition:     original.payment_condition,
      delivery_time:         original.delivery_time,
      delivery_address:      original.delivery_address,
      estimated_total_amount: original.estimated_total_amount,
    })
    .select("id")
    .single()

  if (error || !newOrder) throw new Error(error?.message ?? "Erro ao duplicar")

  const items = (original.order_items as any[]).map((i) => ({
    order_id:           newOrder.id,
    product_id:         i.product_id,
    requested_quantity: i.requested_quantity,
    unit_price:         i.unit_price,
    discount_pct:       i.discount_pct,
    discount_amount:    i.discount_amount,
    item_notes:         i.item_notes,
    subtotal:           i.subtotal,
  }))

  await supabaseAdmin.from("order_items").insert(items)

  await supabaseAdmin.from("order_status_history").insert({
    order_id:   newOrder.id,
    from_status: null,
    to_status:  "recebido",
    changed_by: session.user.id,
    notes:      `Duplicado do pedido #${String(original.order_number).padStart(4, "0")}`,
  })

  revalidatePath("/pedidos")
  redirect(`/pedidos/${newOrder.id}`)
}
