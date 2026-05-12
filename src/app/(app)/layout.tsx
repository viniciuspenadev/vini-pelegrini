import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  // Platform admin sem tenant → redireciona para God Mode
  if (!session.user.tenantId) redirect("/god")

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", session.user.tenantId)
    .single()

  return (
    <AppShell
      userName={session.user.name ?? "Usuário"}
      userEmail={session.user.email ?? ""}
      tenantName={tenant?.name ?? ""}
      userRole={session.user.role}
    >
      {children}
    </AppShell>
  )
}
