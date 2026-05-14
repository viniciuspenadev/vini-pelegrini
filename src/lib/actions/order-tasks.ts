"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function requireSession(orderId: string) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  return session
}

export async function createOrderTask(orderId: string, data: {
  title:       string
  assigneeId?: string | null
  dueDate?:    string | null
}) {
  const session = await requireSession(orderId)

  // próxima posição
  const { data: last } = await supabaseAdmin
    .from("order_tasks")
    .select("position")
    .eq("order_id", orderId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPos = (last?.position ?? -1) + 1

  const { error } = await supabaseAdmin.from("order_tasks").insert({
    order_id:    orderId,
    tenant_id:   session.user.tenantId,
    title:       data.title.trim(),
    assignee_id: data.assigneeId || null,
    due_date:    data.dueDate || null,
    position:    nextPos,
    created_by:  session.user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/pedidos/${orderId}`)
}

export async function toggleOrderTask(taskId: string, orderId: string, done: boolean) {
  const session = await requireSession(orderId)

  const { error } = await supabaseAdmin
    .from("order_tasks")
    .update({
      done,
      completed_at: done ? new Date().toISOString() : null,
      completed_by: done ? session.user.id : null,
    })
    .eq("id", taskId)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath(`/pedidos/${orderId}`)
}

export async function deleteOrderTask(taskId: string, orderId: string) {
  const session = await requireSession(orderId)

  const { error } = await supabaseAdmin
    .from("order_tasks")
    .delete()
    .eq("id", taskId)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath(`/pedidos/${orderId}`)
}
