"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

function requireAdminOrOwner(role: string) {
  if (!["owner", "admin"].includes(role)) throw new Error("Sem permissão")
}

export async function createUser(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  requireAdminOrOwner(session.user.role)

  const email     = (formData.get("email") as string).toLowerCase().trim()
  const full_name = formData.get("full_name") as string
  const password  = formData.get("password") as string
  const role      = formData.get("role") as string

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single()

  let userId: string

  if (existing) {
    userId = existing.id
  } else {
    const password_hash = await bcrypt.hash(password, 12)
    const { data: newProfile, error } = await supabaseAdmin
      .from("profiles")
      .insert({ email, full_name, password_hash })
      .select("id")
      .single()
    if (error || !newProfile) throw new Error(error?.message ?? "Erro ao criar perfil")
    userId = newProfile.id
  }

  const { data: existingMembership } = await supabaseAdmin
    .from("tenant_users")
    .select("id, active")
    .eq("tenant_id", session.user.tenantId)
    .eq("user_id", userId)
    .single()

  if (existingMembership) {
    if (existingMembership.active) throw new Error("Usuário já é membro ativo deste tenant")
    await supabaseAdmin
      .from("tenant_users")
      .update({ active: true, role })
      .eq("id", existingMembership.id)
  } else {
    const { error } = await supabaseAdmin
      .from("tenant_users")
      .insert({ tenant_id: session.user.tenantId, user_id: userId, role, active: true })
    if (error) throw new Error(error.message)
  }

  revalidatePath("/usuarios")
  redirect("/usuarios")
}

export async function updateUserRole(userId: string, role: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  requireAdminOrOwner(session.user.role)

  if (session.user.role === "admin") {
    const { data: target } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("tenant_id", session.user.tenantId)
      .eq("user_id", userId)
      .single()
    if (target?.role === "owner") throw new Error("Admins não podem alterar o role do proprietário")
  }

  await supabaseAdmin
    .from("tenant_users")
    .update({ role })
    .eq("tenant_id", session.user.tenantId)
    .eq("user_id", userId)

  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${userId}`)
}

export async function toggleUserActive(userId: string, active: boolean) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  requireAdminOrOwner(session.user.role)

  if (userId === session.user.id) throw new Error("Não é possível alterar o próprio acesso")

  await supabaseAdmin
    .from("tenant_users")
    .update({ active })
    .eq("tenant_id", session.user.tenantId)
    .eq("user_id", userId)

  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${userId}`)
}

export async function updateUserPipelineVisibility(userId: string, viewAll: boolean) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  requireAdminOrOwner(session.user.role)

  const { data: membership } = await supabaseAdmin
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", session.user.tenantId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!membership) throw new Error("Usuário não pertence a este tenant")

  await supabaseAdmin
    .from("profiles")
    .update({ view_all_conversations: viewAll })
    .eq("id", userId)

  revalidatePath(`/usuarios/${userId}`)
}

export async function updateUserCommission(userId: string, commissionPct: number) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  requireAdminOrOwner(session.user.role)

  if (commissionPct < 0 || commissionPct > 100) {
    throw new Error("Comissão deve estar entre 0 e 100%")
  }

  // Confirma que o user pertence ao tenant antes de mexer em profile global
  const { data: membership } = await supabaseAdmin
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", session.user.tenantId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!membership) throw new Error("Usuário não pertence a este tenant")

  await supabaseAdmin
    .from("profiles")
    .update({ commission_pct: commissionPct })
    .eq("id", userId)

  revalidatePath(`/usuarios/${userId}`)
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  requireAdminOrOwner(session.user.role)

  const password_hash = await bcrypt.hash(newPassword, 12)
  await supabaseAdmin
    .from("profiles")
    .update({ password_hash })
    .eq("id", userId)

  revalidatePath(`/usuarios/${userId}`)
}
