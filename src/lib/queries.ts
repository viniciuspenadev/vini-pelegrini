import { supabaseAdmin } from "@/lib/supabase"

export interface TenantUser {
  id:        string
  full_name: string | null
  email:     string
  role:      string
  active:    boolean
}

/** Retorna todos os usuários ativos de um tenant via tenant_users → profiles */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const { data } = await supabaseAdmin
    .from("tenant_users")
    .select("role, active, profiles!tenant_users_user_id_fkey ( id, full_name, email )")
    .eq("tenant_id", tenantId)
    .order("role")

  return (data ?? []).map((row: any) => ({
    id:        row.profiles.id,
    full_name: row.profiles.full_name,
    email:     row.profiles.email,
    role:      row.role,
    active:    row.active,
  }))
}

/** Retorna apenas usuários que podem ser atribuídos como vendedor (owner, admin, vendedor) */
export async function getTenantVendedores(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("tenant_users")
    .select("profiles!tenant_users_user_id_fkey ( id, full_name, email )")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .in("role", ["owner", "admin", "vendedor"])

  return (data ?? []).map((row: any) => ({
    id:        row.profiles.id,
    full_name: row.profiles.full_name,
    email:     row.profiles.email,
  }))
}
