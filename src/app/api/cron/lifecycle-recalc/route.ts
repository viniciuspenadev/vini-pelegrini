import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// ═══════════════════════════════════════════════════════════════
// Recalcula o lifecycle de contatos com base em last_order_at
// Cron sugerido: 1x ao dia (3h da manhã)
//   0 3 * * * curl -H "Authorization: Bearer $CRON_SECRET" \
//             https://seu-dominio.com/api/cron/lifecycle-recalc
//
// Lógica por tenant (com inactivity_days próprio):
//   - last_order_at recente   → active_customer
//   - last_order_at antigo    → inactive_customer
//   - sem pedido + tem customer_id → customer (mantém)
//   - sem customer_id         → não toca (continua contact/lead/unfit)
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 })
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 1. Atualiza last_order_at de todos os contatos com customer_id
  // (idempotente — pega o MAX(created_at) de orders por customer)
  await supabaseAdmin.rpc("noop").then(() => {}) // placeholder pra evitar warning
  const { error: refreshErr } = await supabaseAdmin
    .from("chat_contacts")
    .select("id")
    .limit(0)
  // Em vez de RPC, usamos uma query UPDATE direta via SQL — não há rpc helper
  // Vamos usar a Management API equivalente: rodamos via query inline.
  // Mas como o supabaseAdmin não expõe SQL bruto, vamos atualizar contato a contato.

  // Busca todos os contatos com customer_id e calcula last_order_at
  const { data: contacts } = await supabaseAdmin
    .from("chat_contacts")
    .select("id, tenant_id, customer_id, lifecycle_stage, last_order_at")
    .not("customer_id", "is", null)

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, updated: 0 })
  }

  // Configurações de inactivity_days por tenant (cache)
  const tenantIds = Array.from(new Set(contacts.map((c) => c.tenant_id)))
  const { data: configs } = await supabaseAdmin
    .from("tenant_marketing_config")
    .select("tenant_id, inactivity_days")
    .in("tenant_id", tenantIds)

  const inactivityByTenant = new Map<string, number>()
  for (const c of configs ?? []) {
    inactivityByTenant.set(c.tenant_id, c.inactivity_days ?? 60)
  }

  // Para cada contato, busca o maior order.created_at e recalcula lifecycle
  const customerIds = Array.from(new Set(contacts.map((c) => c.customer_id!).filter(Boolean)))
  const { data: orderAggs } = await supabaseAdmin
    .from("orders")
    .select("customer_id, created_at")
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false })

  // Mapa customer_id → last_order_at
  const lastOrderByCustomer = new Map<string, string>()
  for (const o of orderAggs ?? []) {
    if (!lastOrderByCustomer.has(o.customer_id)) {
      lastOrderByCustomer.set(o.customer_id, o.created_at)
    }
  }

  const now = Date.now()
  let updated = 0

  for (const c of contacts) {
    const lastOrder    = c.customer_id ? lastOrderByCustomer.get(c.customer_id) : null
    const days         = inactivityByTenant.get(c.tenant_id) ?? 60
    const thresholdMs  = days * 86_400_000

    let nextStage: string
    if (!lastOrder) {
      nextStage = "customer"   // já é cliente mas sem pedido ainda
    } else {
      const ageMs = now - new Date(lastOrder).getTime()
      nextStage   = ageMs <= thresholdMs ? "active_customer" : "inactive_customer"
    }

    // Não rebaixa quem foi marcado manualmente (unfit, lead) — só mexe se já está no fluxo customer
    const currentlyCustomer = ["customer", "active_customer", "inactive_customer"].includes(c.lifecycle_stage)
    if (!currentlyCustomer) continue

    const needsUpdate = c.lifecycle_stage !== nextStage || c.last_order_at !== lastOrder
    if (!needsUpdate) continue

    await supabaseAdmin
      .from("chat_contacts")
      .update({
        lifecycle_stage:      nextStage,
        lifecycle_changed_at: c.lifecycle_stage !== nextStage ? new Date().toISOString() : undefined,
        last_order_at:        lastOrder ?? null,
        updated_at:           new Date().toISOString(),
      })
      .eq("id", c.id)

    updated++
  }

  return NextResponse.json({
    ok:        true,
    checked:   contacts.length,
    updated,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
