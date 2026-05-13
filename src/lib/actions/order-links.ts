"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function generateOrderLink(orderId: string, expiresInDays: number) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Unauthorized")

  // Confirm order belongs to tenant
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, order_number")
    .eq("id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!order) throw new Error("Order not found")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const { data, error } = await supabaseAdmin
    .from("order_links")
    .insert({
      order_id:   orderId,
      tenant_id:  session.user.tenantId,
      expires_at: expiresAt.toISOString(),
      created_by: session.user.id,
    })
    .select("id, token, expires_at, views, revoked, created_at")
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/pedidos/${orderId}`)
  return data
}

export async function revokeOrderLink(linkId: string, orderId: string) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Unauthorized")

  const { error } = await supabaseAdmin
    .from("order_links")
    .update({ revoked: true })
    .eq("id", linkId)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)

  revalidatePath(`/pedidos/${orderId}`)
}

export async function getOrderLinks(orderId: string) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Unauthorized")

  const { data } = await supabaseAdmin
    .from("order_links")
    .select("id, token, expires_at, views, revoked, created_at")
    .eq("order_id", orderId)
    .eq("tenant_id", session.user.tenantId)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}
