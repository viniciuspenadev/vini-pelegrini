import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { AppShell } from "@/components/app-shell"
import { getActiveModules } from "@/lib/modules"
import { getSegmentConfig } from "@/lib/segments/registry"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  // Platform admin sem tenant → redireciona para God Mode
  if (!session.user.tenantId) redirect("/god")

  const [{ data: tenant }, activeModules] = await Promise.all([
    supabaseAdmin
      .from("tenants")
      .select("name, segment")
      .eq("id", session.user.tenantId)
      .single(),
    getActiveModules(session.user.tenantId),
  ])

  const segmentConfig = getSegmentConfig(tenant?.segment ?? null)

  return (
    <AppShell
      userName={session.user.name ?? "Usuário"}
      userEmail={session.user.email ?? ""}
      tenantName={tenant?.name ?? ""}
      userRole={session.user.role}
      activeModules={Array.from(activeModules)}
      navLabels={segmentConfig.navLabels}
    >
      {children}
    </AppShell>
  )
}
