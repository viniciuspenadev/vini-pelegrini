"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Constrói o objeto metadata a partir dos campos prefixados com "meta_" no FormData.
 * Aceita: meta_origem, meta_designer_parceiro, meta_profissao,
 *         meta_co_titular_nome, meta_co_titular_cpf
 *
 * Endereço de obra NÃO vive aqui — vive em projects.install_address
 * (1 cliente pode ter N projetos com endereços diferentes).
 */
function buildMetadata(formData: FormData): Record<string, unknown> {
  const meta: Record<string, unknown> = {}
  const keys = ["origem", "designer_parceiro", "profissao", "co_titular_nome", "co_titular_cpf"]
  for (const k of keys) {
    const v = formData.get(`meta_${k}`)
    if (typeof v === "string" && v.trim()) meta[k] = v.trim()
  }
  return meta
}

export async function createCustomer(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const kind         = (formData.get("kind") as string) === "B2C" ? "B2C" : "B2B"
  const isento       = formData.get("isento_ie") === "on"
  const contribuinte = formData.get("contribuinte_icms") === "on"
  const metadata     = buildMetadata(formData)

  const payload = {
    tenant_id:           session.user.tenantId,
    owner_id:            session.user.id,
    created_by:          session.user.id,
    kind,
    metadata,
    razao_social:        formData.get("razao_social") as string,
    nome_fantasia:       formData.get("nome_fantasia") as string || null,
    cnpj_cpf:            formData.get("cnpj_cpf") as string,
    inscricao_estadual:  isento ? null : formData.get("inscricao_estadual") as string || null,
    isento_ie:           isento,
    regime_tributario:   formData.get("regime_tributario") as string || null,
    contribuinte_icms:   contribuinte,
    cep:                 formData.get("cep") as string || null,
    logradouro:          formData.get("logradouro") as string || null,
    numero:              formData.get("numero") as string || null,
    complemento:         formData.get("complemento") as string || null,
    bairro:              formData.get("bairro") as string || null,
    cidade:              formData.get("cidade") as string || null,
    estado:              formData.get("estado") as string || null,
    codigo_ibge:         formData.get("codigo_ibge") as string || null,
    rota_entrega:        formData.get("rota_entrega") as string || null,
    janela_entrega:      formData.get("janela_entrega") as string || null,
    instrucoes_entrega:  formData.get("instrucoes_entrega") as string || null,
    telefone:            formData.get("telefone") as string || null,
    comprador_nome:      formData.get("comprador_nome") as string || null,
    comprador_whatsapp:  formData.get("comprador_whatsapp") as string || null,
    email_financeiro:    formData.get("email_financeiro") as string || null,
    email_nfe:           formData.get("email_nfe") as string || null,
    tabela_preco:        formData.get("tabela_preco") as string || "padrao",
    limite_credito:      parseFloat(formData.get("limite_credito") as string || "0"),
    condicao_pagamento:  formData.get("condicao_pagamento") as string || "A vista",
    forma_pagamento:     formData.get("forma_pagamento") as string || null,
    desconto_padrao:     parseFloat(formData.get("desconto_padrao") as string || "0"),
    vendedor_id:         session.user.role === "vendedor"
                           ? session.user.id
                           : formData.get("vendedor_id") as string || null,
    observacoes:         formData.get("observacoes") as string || null,
  }

  const { data, error } = await supabaseAdmin.from("customers").insert(payload).select("id").single()
  if (error) throw new Error(error.message)

  revalidatePath("/clientes")
  redirect(`/clientes/${data.id}`)
}

export async function updateCustomer(id: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const isento       = formData.get("isento_ie") === "on"
  const contribuinte = formData.get("contribuinte_icms") === "on"
  const newMetadata  = buildMetadata(formData)
  const kindParam    = formData.get("kind") as string | null

  // Busca vendedor + metadata atual antes de sobrescrever
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("vendedor_id, kind, metadata")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single()

  // Merge metadata (preserva chaves existentes que não vieram no form)
  const mergedMetadata = { ...(existing?.metadata ?? {}), ...newMetadata }

  const payload = {
    // kind só muda se foi enviado explicitamente — senão mantém o atual
    ...(kindParam === "B2B" || kindParam === "B2C" ? { kind: kindParam } : {}),
    metadata:            mergedMetadata,
    razao_social:        formData.get("razao_social") as string,
    nome_fantasia:       formData.get("nome_fantasia") as string || null,
    cnpj_cpf:            formData.get("cnpj_cpf") as string,
    inscricao_estadual:  isento ? null : formData.get("inscricao_estadual") as string || null,
    isento_ie:           isento,
    regime_tributario:   formData.get("regime_tributario") as string || null,
    contribuinte_icms:   contribuinte,
    cep:                 formData.get("cep") as string || null,
    logradouro:          formData.get("logradouro") as string || null,
    numero:              formData.get("numero") as string || null,
    complemento:         formData.get("complemento") as string || null,
    bairro:              formData.get("bairro") as string || null,
    cidade:              formData.get("cidade") as string || null,
    estado:              formData.get("estado") as string || null,
    codigo_ibge:         formData.get("codigo_ibge") as string || null,
    rota_entrega:        formData.get("rota_entrega") as string || null,
    janela_entrega:      formData.get("janela_entrega") as string || null,
    instrucoes_entrega:  formData.get("instrucoes_entrega") as string || null,
    telefone:            formData.get("telefone") as string || null,
    comprador_nome:      formData.get("comprador_nome") as string || null,
    comprador_whatsapp:  formData.get("comprador_whatsapp") as string || null,
    email_financeiro:    formData.get("email_financeiro") as string || null,
    email_nfe:           formData.get("email_nfe") as string || null,
    tabela_preco:        formData.get("tabela_preco") as string || "padrao",
    limite_credito:      parseFloat(formData.get("limite_credito") as string || "0"),
    condicao_pagamento:  formData.get("condicao_pagamento") as string || "A vista",
    forma_pagamento:     formData.get("forma_pagamento") as string || null,
    desconto_padrao:     parseFloat(formData.get("desconto_padrao") as string || "0"),
    vendedor_id:         formData.get("vendedor_id") as string || null,
    status:              formData.get("status") as string || undefined,
    observacoes:         formData.get("observacoes") as string || null,
  }

  const { error } = await supabaseAdmin
    .from("customers")
    .update(payload)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)

  // Registra troca de vendedor no histórico se o campo mudou
  const newVendedor = payload.vendedor_id
  if (existing && existing.vendedor_id !== newVendedor) {
    await supabaseAdmin.from("customer_vendedor_history").insert({
      customer_id:     id,
      old_vendedor_id: existing.vendedor_id,
      new_vendedor_id: newVendedor,
      changed_by:      session.user.id,
    })
  }

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  redirect(`/clientes/${id}`)
}

export async function getCustomerCredit(customerId: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const [{ data: activeOrders }, { data: lastOrders }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("final_total_amount, estimated_total_amount")
      .eq("customer_id", customerId)
      .eq("tenant_id", session.user.tenantId)
      .in("status", ["recebido", "em_separacao", "aguardando_faturamento", "faturado", "em_rota"]),

    supabaseAdmin
      .from("orders")
      .select(`
        id, order_number,
        order_items (
          requested_quantity, unit_price, discount_pct,
          products ( id, nome, sku, unidade_medida, metadata )
        )
      `)
      .eq("customer_id", customerId)
      .eq("tenant_id", session.user.tenantId)
      .neq("status", "cancelado")
      .order("created_at", { ascending: false })
      .limit(1),
  ])

  const creditoEmUso = (activeOrders ?? []).reduce(
    (s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0
  )

  const lastRow = lastOrders?.[0] ?? null
  const lastOrder = lastRow ? {
    order_number: lastRow.order_number as number,
    items: ((lastRow.order_items as any[]) ?? [])
      .filter((i) => i.products?.id)
      .map((i) => ({
        product_id:         String(i.products.id),
        product_nome:       String(i.products.nome),
        sku:                i.products.sku as string | null,
        unidade_medida:     String(i.products.unidade_medida),
        venda_peso_variavel: i.products.metadata?.venda_peso_variavel ?? false,
        requested_quantity: Number(i.requested_quantity),
        unit_price:         Number(i.unit_price),
        discount_pct:       Number(i.discount_pct ?? 0),
      })),
  } : null

  return { creditoEmUso, lastOrder }
}
