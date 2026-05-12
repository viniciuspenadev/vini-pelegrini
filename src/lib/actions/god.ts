"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

async function requireGodMode() {
  const session = await auth()
  if (!session?.user.isPlatformAdmin) throw new Error("Acesso negado")
  return session
}

async function logAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", adminId)
    .single()

  if (!admin) return
  await supabaseAdmin.from("god_audit_log").insert({
    admin_id:    admin.id,
    action,
    entity_type: entityType,
    entity_id:   entityId,
    metadata,
  })
}

// ── Tenants ──────────────────────────────────────────────────────────────────

export async function createTenant(formData: FormData) {
  const session = await requireGodMode()

  const name     = formData.get("name") as string
  const slug     = formData.get("slug") as string
  const plan     = formData.get("plan") as string || "trial"
  const planId   = formData.get("plan_id") as string || null
  const modules  = JSON.parse(formData.get("modules") as string || "[]")

  // Cria o owner
  const ownerName  = formData.get("owner_name") as string
  const ownerEmail = formData.get("owner_email") as string
  const ownerPass  = formData.get("owner_password") as string
  const hash       = await bcrypt.hash(ownerPass, 10)

  // Cria perfil do owner
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({ email: ownerEmail, full_name: ownerName, password_hash: hash })
    .select("id")
    .single()

  if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`)

  // Cria o tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({ name, slug, status: "trial", plan, plan_id: planId || null, modules })
    .select("id")
    .single()

  if (tenantError) throw new Error(`Erro ao criar tenant: ${tenantError.message}`)

  // Vincula owner ao tenant
  await supabaseAdmin.from("tenant_users").insert({
    tenant_id: tenant.id,
    user_id:   profile.id,
    role:      "owner",
    active:    true,
  })

  await logAction(session.user.id, "tenant.created", "tenant", tenant.id, { name, slug, plan })

  revalidatePath("/god/tenants")
  redirect(`/god/tenants/${tenant.id}`)
}

export async function updateTenantStatus(tenantId: string, status: string, note?: string) {
  const session = await requireGodMode()

  await supabaseAdmin
    .from("tenants")
    .update({ status })
    .eq("id", tenantId)

  await logAction(session.user.id, `tenant.status.${status}`, "tenant", tenantId, { note })

  revalidatePath(`/god/tenants/${tenantId}`)
  revalidatePath("/god/tenants")
}

export async function updateTenantPlan(tenantId: string, planId: string) {
  const session = await requireGodMode()

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("name, modules, plan_id:id")
    .eq("id", planId)
    .single() as any

  await supabaseAdmin
    .from("tenants")
    .update({ plan_id: planId, plan: plan?.name ?? "custom" })
    .eq("id", tenantId)

  await logAction(session.user.id, "tenant.plan.changed", "tenant", tenantId, { plan_id: planId })

  revalidatePath(`/god/tenants/${tenantId}`)
}

export async function toggleTenantModule(
  tenantId: string,
  moduleKey: string,
  enabled: boolean,
  note?: string
) {
  const session = await requireGodMode()

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", session.user.id)
    .single()

  await supabaseAdmin
    .from("tenant_modules")
    .upsert(
      { tenant_id: tenantId, module_key: moduleKey, enabled, note: note ?? null, added_by: admin?.id ?? null },
      { onConflict: "tenant_id,module_key" }
    )

  await logAction(session.user.id, `module.${enabled ? "enabled" : "disabled"}`, "tenant", tenantId, { module_key: moduleKey })

  revalidatePath(`/god/tenants/${tenantId}`)
}

// ── Planos ────────────────────────────────────────────────────────────────────

export async function createPlan(formData: FormData) {
  await requireGodMode()

  const modules = JSON.parse(formData.get("modules") as string || "[]")

  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      name:          formData.get("name") as string,
      description:   formData.get("description") as string || null,
      price_monthly: parseFloat(formData.get("price_monthly") as string || "0"),
      modules,
      limits: {
        users:             parseInt(formData.get("limit_users") as string || "5"),
        orders_per_month:  parseInt(formData.get("limit_orders") as string || "500"),
      },
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/god/planos")
  redirect(`/god/planos/${data.id}`)
}

export async function updatePlan(planId: string, formData: FormData) {
  await requireGodMode()

  const modules = JSON.parse(formData.get("modules") as string || "[]")

  await supabaseAdmin
    .from("plans")
    .update({
      name:          formData.get("name") as string,
      description:   formData.get("description") as string || null,
      price_monthly: parseFloat(formData.get("price_monthly") as string || "0"),
      modules,
      limits: {
        users:            parseInt(formData.get("limit_users") as string || "5"),
        orders_per_month: parseInt(formData.get("limit_orders") as string || "500"),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)

  revalidatePath("/god/planos")
  revalidatePath(`/god/planos/${planId}`)
  redirect(`/god/planos/${planId}`)
}
