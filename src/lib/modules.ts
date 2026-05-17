import { supabaseAdmin } from "@/lib/supabase"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

/**
 * Calcula os módulos ATIVOS para um tenant, considerando:
 *   1. tenants.modules (jsonb) — módulos do plano base
 *   2. tenant_modules — overrides individuais (enable/disable)
 *
 * Overrides têm precedência sobre o plano.
 *
 * Retorna um Set<string> com as chaves de módulo ativas.
 */
export async function getActiveModules(tenantId: string): Promise<Set<string>> {
  const [tenantRes, overridesRes] = await Promise.all([
    supabaseAdmin
      .from("tenants")
      .select("modules")
      .eq("id", tenantId)
      .single(),
    supabaseAdmin
      .from("tenant_modules")
      .select("module_key, enabled")
      .eq("tenant_id", tenantId),
  ])

  const planModules: string[] = Array.isArray(tenantRes.data?.modules) ? tenantRes.data.modules : []
  const active = new Set<string>(planModules)

  for (const ov of overridesRes.data ?? []) {
    if (ov.enabled) active.add(ov.module_key)
    else active.delete(ov.module_key)
  }

  return active
}

export function hasModule(activeModules: Set<string>, key: string): boolean {
  return activeModules.has(key)
}

/** Checa se qualquer um dos módulos está ativo (útil para grupos do sidebar). */
export function hasAnyModule(activeModules: Set<string>, keys: string[]): boolean {
  return keys.some((k) => activeModules.has(k))
}

/**
 * Guard server-side para usar em layouts ou pages.
 *
 * Verifica se o tenant tem pelo menos UM dos módulos requeridos. Se não tiver,
 * redireciona para /modulo-indisponivel (ou /).
 *
 * Uso:
 *   await requireModule("pescados.pedidos")            // exato
 *   await requireModule(["pescados.pedidos", "moveis.projetos"])  // qualquer um
 */
export async function requireModule(moduleOrModules: string | string[]): Promise<Set<string>> {
  const session = await auth()
  if (!session?.user?.tenantId) redirect("/auth/signin")

  const active = await getActiveModules(session.user.tenantId)
  const keys   = Array.isArray(moduleOrModules) ? moduleOrModules : [moduleOrModules]

  if (!keys.some((k) => active.has(k))) {
    redirect("/modulo-indisponivel")
  }

  return active
}
