"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createProduct(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const metadata = {
    tipo_conservacao:    formData.get("tipo_conservacao") || null,
    venda_peso_variavel: formData.get("venda_peso_variavel") === "on",
    peso_medio_estimado: parseFloat(formData.get("peso_medio_estimado") as string) || null,
    dias_validade:       parseInt(formData.get("dias_validade") as string) || null,
  }

  const payload = {
    tenant_id:      session.user.tenantId,
    created_by:     session.user.id,
    nome:           formData.get("nome") as string,
    sku:            formData.get("sku") as string || null,
    categoria:      formData.get("categoria") as string || null,
    unidade_medida: formData.get("unidade_medida") as string || "kg",
    preco_base:     parseFloat(formData.get("preco_base") as string) || 0,
    metadata,
  }

  const { error } = await supabaseAdmin.from("products").insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath("/produtos")
  redirect("/produtos")
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const metadata = {
    tipo_conservacao:    formData.get("tipo_conservacao") || null,
    venda_peso_variavel: formData.get("venda_peso_variavel") === "on",
    peso_medio_estimado: parseFloat(formData.get("peso_medio_estimado") as string) || null,
    dias_validade:       parseInt(formData.get("dias_validade") as string) || null,
  }

  const payload = {
    nome:           formData.get("nome") as string,
    sku:            formData.get("sku") as string || null,
    categoria:      formData.get("categoria") as string || null,
    unidade_medida: formData.get("unidade_medida") as string || "kg",
    preco_base:     parseFloat(formData.get("preco_base") as string) || 0,
    status:         formData.get("status") as string,
    metadata,
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
