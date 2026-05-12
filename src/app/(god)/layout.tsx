import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { GodSidebar } from "@/components/god/god-sidebar"

export default async function GodLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) redirect("/auth/signin")

  // Verifica no banco (não no JWT) — funciona mesmo sem relogar após o setup
  const { data: adminRecord } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", session.user.id)
    .single()

  if (!adminRecord) redirect("/")

  const adminName  = session.user.name  ?? "Admin"
  const adminEmail = session.user.email ?? ""

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <GodSidebar adminName={adminName} adminEmail={adminEmail} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">
              God Mode — Plataforma
            </span>
          </div>
          <span className="ml-auto text-xs text-slate-600">
            Todas as ações são registradas em log
          </span>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
