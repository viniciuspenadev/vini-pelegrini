"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const full_name = (formData.get("full_name") as string).trim()
  if (!full_name) throw new Error("Nome não pode ser vazio")

  await supabaseAdmin
    .from("profiles")
    .update({ full_name })
    .eq("id", session.user.id)

  revalidatePath("/perfil")
}

export async function updatePassword(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const current_password = formData.get("current_password") as string
  const new_password     = formData.get("new_password") as string
  const confirm_password = formData.get("confirm_password") as string

  if (new_password !== confirm_password) throw new Error("As senhas não coincidem")
  if (new_password.length < 8) throw new Error("A nova senha deve ter pelo menos 8 caracteres")

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("password_hash")
    .eq("id", session.user.id)
    .single()

  if (!profile?.password_hash) throw new Error("Perfil não encontrado")

  const valid = await bcrypt.compare(current_password, profile.password_hash)
  if (!valid) throw new Error("Senha atual incorreta")

  const password_hash = await bcrypt.hash(new_password, 12)
  await supabaseAdmin
    .from("profiles")
    .update({ password_hash })
    .eq("id", session.user.id)

  revalidatePath("/perfil")
}
