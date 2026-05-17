"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { filterModulesBySegment, getDefaultModulesForSegment } from "@/lib/modules-catalog"
import { buildTemplate } from "@/lib/financial/default-categories"
import { getPipelineTemplate } from "@/lib/marketing/default-pipelines"

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

  const name        = formData.get("name") as string
  const slug        = formData.get("slug") as string
  const plan        = formData.get("plan") as string || "trial"
  const planId      = formData.get("plan_id") as string || null
  const segment     = (formData.get("segment") as string) || "pescados"
  const rawModules  = JSON.parse(formData.get("modules") as string || "[]") as string[]

  // Bootstrap: filtra módulos do plano por segmento + garante defaults do segmento
  const filtered = filterModulesBySegment(rawModules, segment)
  const defaults = getDefaultModulesForSegment(segment)
  const modules  = Array.from(new Set([...filtered, ...defaults]))

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
    .insert({ name, slug, status: "trial", plan, plan_id: planId || null, segment, modules })
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

  // Bootstrap completo: pipeline + categorias financeiras
  // (tenant nasce 100% pronto, sem depender da 1ª visita do owner)
  await bootstrapTenantDefaults(tenant.id, segment, profile.id)

  await logAction(session.user.id, "tenant.created", "tenant", tenant.id, { name, slug, plan, segment })

  revalidatePath("/god/tenants")
  redirect(`/god/tenants/${tenant.id}`)
}

/**
 * Cria pipeline padrão (com etapas + Triagem) e plano de contas do segmento.
 * Idempotente — checa se já existe antes de criar. Seguro chamar várias vezes.
 */
async function bootstrapTenantDefaults(tenantId: string, segment: string, createdBy: string) {
  // ── 1. Pipeline + estágios do segmento ──────────────────────
  const { count: pipelineCount } = await supabaseAdmin
    .from("pipelines")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  if ((pipelineCount ?? 0) === 0) {
    const tpl = getPipelineTemplate(segment)

    const { data: pipeline } = await supabaseAdmin
      .from("pipelines")
      .insert({
        tenant_id:   tenantId,
        name:        tpl.name,
        description: tpl.description,
        color:       tpl.color,
        is_default:  true,
        position:    0,
        active:      true,
        created_by:  createdBy,
      })
      .select("id")
      .single()

    if (pipeline) {
      const stages = tpl.stages.map((s, i) => ({
        pipeline_id:     pipeline.id,
        tenant_id:       tenantId,
        name:            s.name,
        color:           s.color,
        position:        s.is_triage ? -1 : i,
        probability_pct: s.probability_pct,
        is_won:          s.is_won    ?? false,
        is_lost:         s.is_lost   ?? false,
        is_triage:       s.is_triage ?? false,
      }))
      await supabaseAdmin.from("pipeline_stages").insert(stages)

      await supabaseAdmin
        .from("tenant_marketing_config")
        .upsert({ tenant_id: tenantId, default_pipeline_id: pipeline.id }, { onConflict: "tenant_id" })
    }
  }

  // ── 2. Plano de contas (categorias financeiras) ────────────
  const { count: catCount } = await supabaseAdmin
    .from("financial_categories")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  if ((catCount ?? 0) === 0) {
    const template = buildTemplate(segment)

    async function insertNode(node: any, parentId: string | null) {
      const { data } = await supabaseAdmin
        .from("financial_categories")
        .insert({
          tenant_id: tenantId,
          parent_id: parentId,
          name:      node.name,
          type:      node.type,
          segment:   segment,
          active:    true,
        })
        .select("id")
        .single()
      if (data && node.children) {
        for (const child of node.children) await insertNode(child, data.id)
      }
    }

    for (const root of template) await insertNode(root, null)

    await supabaseAdmin
      .from("tenant_financial_config")
      .upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" })
  }
}

export async function updateTenantSegment(tenantId: string, segment: string) {
  const session = await requireGodMode()

  // Lê módulos atuais e reconcilia: remove módulos do segmento antigo,
  // adiciona os defaults do segmento novo. Mantém universais e overrides
  // de outros segmentos só se forem reativados via tenant_modules manualmente.
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("modules, segment")
    .eq("id", tenantId)
    .single()

  const currentModules: string[] = Array.isArray(tenant?.modules) ? tenant.modules : []
  const filtered = filterModulesBySegment(currentModules, segment)
  const defaults = getDefaultModulesForSegment(segment)
  const newModules = Array.from(new Set([...filtered, ...defaults]))

  await supabaseAdmin
    .from("tenants")
    .update({ segment, modules: newModules })
    .eq("id", tenantId)

  await logAction(session.user.id, "tenant.segment.changed", "tenant", tenantId, {
    from: tenant?.segment,
    to:   segment,
    modules_added:   defaults.filter((m) => !currentModules.includes(m)),
    modules_removed: currentModules.filter((m) => !newModules.includes(m)),
  })

  revalidatePath(`/god/tenants/${tenantId}`)
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
  const session = await requireGodMode()

  const name    = formData.get("name") as string
  const modules = JSON.parse(formData.get("modules") as string || "[]")

  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      name,
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

  await logAction(session.user.id, "plan.created", "plan", data.id, { name, modules })

  revalidatePath("/god/planos")
  redirect(`/god/planos/${data.id}`)
}

export async function updatePlan(planId: string, formData: FormData) {
  const session = await requireGodMode()

  const name    = formData.get("name") as string
  const modules = JSON.parse(formData.get("modules") as string || "[]")

  await supabaseAdmin
    .from("plans")
    .update({
      name,
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

  await logAction(session.user.id, "plan.updated", "plan", planId, { name, modules })

  revalidatePath("/god/planos")
  revalidatePath(`/god/planos/${planId}`)
  redirect(`/god/planos/${planId}`)
}
