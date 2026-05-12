"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function setupPlatformAdmin(formData: FormData) {
  // Só funciona enquanto não existe nenhum platform admin
  const { count } = await supabaseAdmin
    .from("platform_admins")
    .select("id", { count: "exact", head: true })

  if ((count ?? 0) > 0) redirect("/god")

  const name     = (formData.get("name") as string)?.trim()
  const email    = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const confirm  = formData.get("confirm") as string

  if (!name || !email || !password) redirect("/setup?error=missing")
  if (password !== confirm)          redirect("/setup?error=mismatch")
  if (password.length < 8)           redirect("/setup?error=weak")

  // Verifica se já existe um perfil com esse email
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .single()

  if (existing) redirect("/setup?error=exists")

  const hash = await bcrypt.hash(password, 10)

  // Cria o perfil do admin da plataforma
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({ email, full_name: name, password_hash: hash })
    .select("id")
    .single()

  if (profileError || !profile) redirect("/setup?error=unknown")

  // Registra como platform admin
  const { error: adminError } = await supabaseAdmin
    .from("platform_admins")
    .insert({ user_id: profile.id })

  if (adminError) redirect("/setup?error=unknown")

  redirect(`/setup?done=1&email=${encodeURIComponent(email)}`)
}
