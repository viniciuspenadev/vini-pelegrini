import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

// ── Configurar aqui ──────────────────────────────────────────
const TENANT_NAME = "Pescados Demo"
const TENANT_SLUG = "pescados-demo"
const USER_NAME   = "Administrador"
const USER_EMAIL  = "admin@pescados.com"
const USER_PASS   = "admin123"
// ────────────────────────────────────────────────────────────

const supabase = createClient(
  "https://zcshyqsicdghrdkxzmrq.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seed() {
  const passwordHash = await bcrypt.hash(USER_PASS, 12)

  // 1. Tenant
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .insert({ name: TENANT_NAME, slug: TENANT_SLUG, status: "active" })
    .select()
    .single()

  if (tErr) { console.error("Tenant:", tErr.message); process.exit(1) }
  console.log("✓ Tenant criado:", tenant.id)

  // 2. Profile
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .insert({ email: USER_EMAIL, full_name: USER_NAME, password_hash: passwordHash })
    .select()
    .single()

  if (pErr) { console.error("Profile:", pErr.message); process.exit(1) }
  console.log("✓ Profile criado:", profile.id)

  // 3. Associação tenant_user como owner
  const { error: tuErr } = await supabase
    .from("tenant_users")
    .insert({ tenant_id: tenant.id, user_id: profile.id, role: "owner" })

  if (tuErr) { console.error("TenantUser:", tuErr.message); process.exit(1) }

  console.log("\n✅ Seed completo!")
  console.log(`   Email: ${USER_EMAIL}`)
  console.log(`   Senha: ${USER_PASS}`)
}

seed()
