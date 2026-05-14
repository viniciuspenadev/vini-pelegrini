"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const FISCAL_ROLES = ["owner", "admin", "financeiro"]

function buildFiscalPayload(formData: FormData) {
  const num = (k: string) => {
    const v = formData.get(k) as string | null
    if (!v) return null
    const n = parseFloat(v.replace(",", "."))
    return isNaN(n) ? null : n
  }
  const int = (k: string) => {
    const v = formData.get(k) as string | null
    if (!v) return null
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }
  const txt = (k: string) => (formData.get(k) as string)?.trim() || null

  return {
    ncm:             txt("ncm"),
    cest:            txt("cest"),
    origem:          int("origem"),
    cfop_padrao:     txt("cfop_padrao"),
    cst_icms:        txt("cst_icms"),
    csosn_icms:      txt("csosn_icms"),
    cst_pis:         txt("cst_pis"),
    cst_cofins:      txt("cst_cofins"),
    aliquota_icms:   num("aliquota_icms"),
    aliquota_pis:    num("aliquota_pis"),
    aliquota_cofins: num("aliquota_cofins"),
    ean:             txt("ean"),
  }
}

export async function createProduct(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const canEditFiscal = FISCAL_ROLES.includes(session.user.role)

  const metadata = {
    tipo_conservacao:    formData.get("tipo_conservacao") || null,
    venda_peso_variavel: formData.get("venda_peso_variavel") === "on",
    peso_medio_estimado: parseFloat(formData.get("peso_medio_estimado") as string) || null,
    dias_validade:       parseInt(formData.get("dias_validade") as string) || null,
  }

  const precoCusto = parseFloat(formData.get("preco_custo") as string)

  const payload = {
    tenant_id:      session.user.tenantId,
    created_by:     session.user.id,
    nome:           formData.get("nome") as string,
    sku:            formData.get("sku") as string || null,
    categoria:      formData.get("categoria") as string || null,
    unidade_medida: formData.get("unidade_medida") as string || "kg",
    preco_base:     parseFloat(formData.get("preco_base") as string) || 0,
    preco_custo:    isNaN(precoCusto) ? null : precoCusto,
    metadata,
    ...(canEditFiscal ? buildFiscalPayload(formData) : {}),
  }

  const { error } = await supabaseAdmin.from("products").insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath("/produtos")
  redirect("/produtos")
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const canEditFiscal = FISCAL_ROLES.includes(session.user.role)

  const metadata = {
    tipo_conservacao:    formData.get("tipo_conservacao") || null,
    venda_peso_variavel: formData.get("venda_peso_variavel") === "on",
    peso_medio_estimado: parseFloat(formData.get("peso_medio_estimado") as string) || null,
    dias_validade:       parseInt(formData.get("dias_validade") as string) || null,
  }

  const precoCustoUpdate = parseFloat(formData.get("preco_custo") as string)

  const payload = {
    nome:           formData.get("nome") as string,
    sku:            formData.get("sku") as string || null,
    categoria:      formData.get("categoria") as string || null,
    unidade_medida: formData.get("unidade_medida") as string || "kg",
    preco_base:     parseFloat(formData.get("preco_base") as string) || 0,
    preco_custo:    isNaN(precoCustoUpdate) ? null : precoCustoUpdate,
    status:         formData.get("status") as string,
    metadata,
    ...(canEditFiscal ? buildFiscalPayload(formData) : {}),
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update(payload)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)

  revalidatePath("/produtos")
  redirect("/produtos")
}
