"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function updateCustomerVendedor(
  customerId: string,
  newVendedorId: string | null,
) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("customers")
    .select("vendedor_id")
    .eq("id", customerId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (fetchErr || !existing) throw new Error("Cliente não encontrado")

  if (existing.vendedor_id === newVendedorId) return

  const { error } = await supabaseAdmin
    .from("customers")
    .update({ vendedor_id: newVendedorId })
    .eq("id", customerId)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)

  await supabaseAdmin.from("customer_vendedor_history").insert({
    customer_id:     customerId,
    old_vendedor_id: existing.vendedor_id,
    new_vendedor_id: newVendedorId,
    changed_by:      session.user.id,
  })

  revalidatePath(`/clientes/${customerId}`)
}
