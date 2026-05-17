"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import * as evo from "@/lib/evolution-api"

async function requirePlatformAdmin() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", session.user.id)
    .single()

  if (!admin) throw new Error("Acesso restrito a platform admins")
  return session
}

// Verifica saúde de UMA instância (de qualquer tenant) — usado no /god/saude
export async function recheckTenantHealth(tenantId: string) {
  await requirePlatformAdmin()

  const { data: inst } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("id, evolution_url, evolution_key, instance_name")
    .eq("tenant_id", tenantId)
    .single()

  if (!inst) throw new Error("Tenant sem instância configurada.")

  const now = new Date().toISOString()

  try {
    const r = await evo.getInstanceStatus({
      url:          inst.evolution_url,
      apiKey:       inst.evolution_key,
      instanceName: inst.instance_name,
    })
    const state = r.instance?.state
    const statusMap: Record<string, string> = {
      open:       "connected",
      close:      "disconnected",
      connecting: "connecting",
    }
    const status = statusMap[state ?? "close"] ?? "disconnected"

    const update: Record<string, unknown> = {
      status,
      last_heartbeat_at: now,
      updated_at:        now,
    }
    if (status === "connected") {
      update.reconnect_attempts = 0
      update.last_error         = null
    }

    await supabaseAdmin
      .from("whatsapp_instances")
      .update(update)
      .eq("id", inst.id)

    await logHealthAction(tenantId, "health.rechecked", { status })

    revalidatePath("/god/saude")
    return { status }
  } catch (err) {
    await supabaseAdmin
      .from("whatsapp_instances")
      .update({
        last_heartbeat_at: now,
        last_error:        `Recheck manual falhou: ${(err as Error).message}`,
        updated_at:        now,
      })
      .eq("id", inst.id)

    await logHealthAction(tenantId, "health.recheck_failed", { error: (err as Error).message })

    revalidatePath("/god/saude")
    throw err
  }
}

async function logHealthAction(tenantId: string, action: string, metadata: Record<string, unknown>) {
  const session = await auth()
  if (!session) return
  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", session.user.id)
    .single()
  if (!admin) return
  await supabaseAdmin.from("god_audit_log").insert({
    admin_id:    admin.id,
    action,
    entity_type: "tenant",
    entity_id:   tenantId,
    metadata,
  })
}
