"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function requireSession() {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  return session
}

// ═══════════════════════════════════════════════════════════════
// CRUD project_environments
// ═══════════════════════════════════════════════════════════════
export async function createEnvironment(
  projectId: string,
  data: { name: string; description?: string | null; value?: number }
) {
  const session = await requireSession()

  // próxima position
  const { data: last } = await supabaseAdmin
    .from("project_environments")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabaseAdmin.from("project_environments").insert({
    tenant_id:   session.user.tenantId,
    project_id:  projectId,
    name:        data.name.trim(),
    description: data.description?.trim() || null,
    value:       data.value ?? 0,
    position:    (last?.position ?? -1) + 1,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/moveis/projetos/${projectId}`)
}

export async function updateEnvironment(
  id: string,
  projectId: string,
  data: Partial<{ name: string; description: string | null; value: number; position: number }>
) {
  const session = await requireSession()

  const { error } = await supabaseAdmin
    .from("project_environments")
    .update(data)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath(`/moveis/projetos/${projectId}`)
}

export async function deleteEnvironment(id: string, projectId: string) {
  const session = await requireSession()

  // Anexos com environment_id = id viram "geral" (ON DELETE SET NULL na FK)
  await supabaseAdmin
    .from("project_environments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath(`/moveis/projetos/${projectId}`)
}
