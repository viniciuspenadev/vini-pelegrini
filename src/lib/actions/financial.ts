"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { buildTemplate, type CategoryTemplate } from "@/lib/financial/default-categories"

const FINANCE_ROLES = ["owner", "admin", "financeiro"]

async function requireFinanceRole() {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  if (!FINANCE_ROLES.includes(session.user.role)) {
    throw new Error("Sem permissão para acessar o módulo financeiro")
  }
  return session
}

// ═══════════════════════════════════════════════════════════════
// Bootstrap — semeia categorias padrão na primeira execução
// ═══════════════════════════════════════════════════════════════
export async function ensureFinancialBootstrap(tenantId: string, segment: string | null) {
  // Já existem categorias? não faz nada
  const { count } = await supabaseAdmin
    .from("financial_categories")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  if ((count ?? 0) > 0) return

  // Insere árvore recursivamente
  async function insertNode(node: CategoryTemplate, parentId: string | null) {
    const { data } = await supabaseAdmin
      .from("financial_categories")
      .insert({
        tenant_id: tenantId,
        parent_id: parentId,
        name:      node.name,
        type:      node.type,
        segment:   segment,
        active:    true,
      })
      .select("id")
      .single()

    if (data && node.children) {
      for (const child of node.children) {
        await insertNode(child, data.id)
      }
    }
  }

  const template = buildTemplate(segment)
  for (const root of template) {
    await insertNode(root, null)
  }

  // Cria também a config padrão se não existir
  await supabaseAdmin
    .from("tenant_financial_config")
    .upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" })
}

// ═══════════════════════════════════════════════════════════════
// Bank accounts
// ═══════════════════════════════════════════════════════════════
export async function createBankAccount(formData: FormData) {
  const session = await requireFinanceRole()

  const payload = {
    tenant_id:       session.user.tenantId,
    name:            formData.get("name") as string,
    type:            formData.get("type") as string,
    bank_name:       (formData.get("bank_name") as string) || null,
    bank_code:       (formData.get("bank_code") as string) || null,
    agency:          (formData.get("agency") as string) || null,
    account_number:  (formData.get("account_number") as string) || null,
    initial_balance: parseFloat(formData.get("initial_balance") as string) || 0,
    current_balance: parseFloat(formData.get("initial_balance") as string) || 0,
  }

  const { error } = await supabaseAdmin.from("bank_accounts").insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath("/financeiro/contas")
}

export async function updateBankAccount(id: string, formData: FormData) {
  const session = await requireFinanceRole()

  const payload = {
    name:           formData.get("name") as string,
    type:           formData.get("type") as string,
    bank_name:      (formData.get("bank_name") as string) || null,
    bank_code:      (formData.get("bank_code") as string) || null,
    agency:         (formData.get("agency") as string) || null,
    account_number: (formData.get("account_number") as string) || null,
    active:         formData.get("active") === "on",
    updated_at:     new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("bank_accounts")
    .update(payload)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath("/financeiro/contas")
}

// ═══════════════════════════════════════════════════════════════
// Accounts Receivable
// ═══════════════════════════════════════════════════════════════
export async function createReceivable(formData: FormData) {
  const session = await requireFinanceRole()

  const payload = {
    tenant_id:         session.user.tenantId,
    customer_id:       formData.get("customer_id") as string,
    category_id:       (formData.get("category_id") as string) || null,
    origin_type:       "manual" as const,
    description:       formData.get("description") as string,
    amount:            parseFloat(formData.get("amount") as string),
    due_date:          formData.get("due_date") as string,
    payment_method:    (formData.get("payment_method") as string) || null,
    notes:             (formData.get("notes") as string) || null,
    created_by:        session.user.id,
  }

  const { error } = await supabaseAdmin.from("accounts_receivable").insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath("/financeiro/recebimentos")
}

export async function markReceivablePaid(
  id: string,
  bankAccountId: string,
  paidAt: string,
  paymentMethod: string,
) {
  const session = await requireFinanceRole()

  const { data: receivable } = await supabaseAdmin
    .from("accounts_receivable")
    .select("amount, customer_id, description, category_id")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!receivable) throw new Error("Recebimento não encontrado")

  // Atualiza o receivable
  await supabaseAdmin
    .from("accounts_receivable")
    .update({
      status:          "pago",
      paid_amount:     receivable.amount,
      paid_at:         paidAt,
      bank_account_id: bankAccountId,
      payment_method:  paymentMethod,
      updated_at:      new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  // Cria transação financeira (entrada na conta)
  await supabaseAdmin.from("financial_transactions").insert({
    tenant_id:        session.user.tenantId,
    bank_account_id:  bankAccountId,
    type:             "entrada",
    amount:           receivable.amount,
    transaction_date: paidAt.split("T")[0],
    description:      receivable.description,
    category_id:      receivable.category_id,
    receivable_id:    id,
    created_by:       session.user.id,
  })

  // Atualiza saldo da conta
  await supabaseAdmin.rpc("increment_bank_balance", {
    p_account_id: bankAccountId,
    p_amount:     receivable.amount,
  })

  revalidatePath("/financeiro/recebimentos")
  revalidatePath("/financeiro/contas")
  revalidatePath("/financeiro/fluxo")
}

// ═══════════════════════════════════════════════════════════════
// Accounts Payable
// ═══════════════════════════════════════════════════════════════
export async function createPayable(formData: FormData) {
  const session = await requireFinanceRole()

  const payload = {
    tenant_id:       session.user.tenantId,
    category_id:     (formData.get("category_id") as string) || null,
    supplier_name:   formData.get("supplier_name") as string,
    supplier_cnpj:   (formData.get("supplier_cnpj") as string) || null,
    description:     formData.get("description") as string,
    amount:          parseFloat(formData.get("amount") as string),
    due_date:        formData.get("due_date") as string,
    payment_method:  (formData.get("payment_method") as string) || null,
    document_type:   (formData.get("document_type") as string) || null,
    document_number: (formData.get("document_number") as string) || null,
    notes:           (formData.get("notes") as string) || null,
    created_by:      session.user.id,
  }

  const { error } = await supabaseAdmin.from("accounts_payable").insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath("/financeiro/pagamentos")
}

export async function markPayablePaid(
  id: string,
  bankAccountId: string,
  paidAt: string,
  paymentMethod: string,
) {
  const session = await requireFinanceRole()

  const { data: payable } = await supabaseAdmin
    .from("accounts_payable")
    .select("amount, supplier_name, description, category_id")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!payable) throw new Error("Pagamento não encontrado")

  await supabaseAdmin
    .from("accounts_payable")
    .update({
      status:          "pago",
      paid_amount:     payable.amount,
      paid_at:         paidAt,
      bank_account_id: bankAccountId,
      payment_method:  paymentMethod,
      updated_at:      new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  await supabaseAdmin.from("financial_transactions").insert({
    tenant_id:        session.user.tenantId,
    bank_account_id:  bankAccountId,
    type:             "saida",
    amount:           payable.amount,
    transaction_date: paidAt.split("T")[0],
    description:      `${payable.supplier_name} — ${payable.description}`,
    category_id:      payable.category_id,
    payable_id:       id,
    created_by:       session.user.id,
  })

  await supabaseAdmin.rpc("increment_bank_balance", {
    p_account_id: bankAccountId,
    p_amount:     -payable.amount,
  })

  revalidatePath("/financeiro/pagamentos")
  revalidatePath("/financeiro/contas")
  revalidatePath("/financeiro/fluxo")
}

// ═══════════════════════════════════════════════════════════════
// Tenant Financial Config
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// Receivable mutations adicionais
// ═══════════════════════════════════════════════════════════════
export async function cancelReceivable(id: string, notes?: string) {
  const session = await requireFinanceRole()

  const { error } = await supabaseAdmin
    .from("accounts_receivable")
    .update({
      status:     "cancelado",
      notes:      notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .in("status", ["aberto", "parcial", "vencido"])

  if (error) throw new Error(error.message)

  revalidatePath("/financeiro/recebimentos")
  revalidatePath(`/financeiro/recebimentos/${id}`)
}

export async function updateReceivableNotes(id: string, notes: string) {
  const session = await requireFinanceRole()

  const { error } = await supabaseAdmin
    .from("accounts_receivable")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)

  revalidatePath(`/financeiro/recebimentos/${id}`)
}

export async function saveFinancialConfig(formData: FormData) {
  const session = await requireFinanceRole()

  const payload = {
    tenant_id:                 session.user.tenantId,
    auto_generate_receivables: formData.get("auto_generate_receivables") === "on",
    trigger_status:            (formData.get("trigger_status") as string) || "faturado",
    default_bank_account_id:   (formData.get("default_bank_account_id") as string) || null,
    default_payment_method:    (formData.get("default_payment_method") as string) || null,
    show_dre:                  formData.get("show_dre") === "on",
    fiscal_year_start_month:   parseInt((formData.get("fiscal_year_start_month") as string) || "1", 10),
    updated_at:                new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("tenant_financial_config")
    .upsert(payload, { onConflict: "tenant_id" })

  if (error) throw new Error(error.message)

  revalidatePath("/configuracoes/financeiro")
}
