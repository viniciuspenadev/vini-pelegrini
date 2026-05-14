import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import { UserActionsPanel } from "@/components/user-actions-panel"
import { ChevronLeft, ChevronRight } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  owner:      "Proprietário",
  admin:      "Administrador",
  vendedor:   "Vendedor",
  financeiro: "Financeiro",
}

export default async function UsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const session = await auth()
  if (!["owner", "admin"].includes(session!.user.role)) redirect("/")

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, email, commission_pct").eq("id", id).single(),
    supabaseAdmin
      .from("tenant_users")
      .select("role, active")
      .eq("user_id", id)
      .eq("tenant_id", session!.user.tenantId)
      .single(),
  ])

  if (!profile || !membership) notFound()

  const isSelf        = id === session!.user.id
  const isTargetOwner = membership.role === "owner"
  const canManage     = !isSelf && !(session!.user.role === "admin" && isTargetOwner)

  return (
    <div className="min-h-full bg-blue-50/50 dark:bg-background pb-20">
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton href="/usuarios" variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
          <ChevronLeft className="size-4" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <span>Usuários</span>
          <ChevronRight className="size-3.5 opacity-50" />
          <span className="text-foreground">{profile.full_name ?? profile.email}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
        {/* Info card */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-4">
          <div className="size-14 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-foreground">
              {(profile.full_name ?? profile.email)[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{profile.full_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ROLE_LABELS[membership.role] ?? membership.role} ·{" "}
              <span className={membership.active ? "text-green-600" : "text-red-500"}>
                {membership.active ? "Ativo" : "Inativo"}
              </span>
            </p>
          </div>
        </div>

        {canManage ? (
          <UserActionsPanel
            userId={id}
            currentRole={membership.role}
            isActive={membership.active}
            isTargetOwner={isTargetOwner}
            sessionRole={session!.user.role}
            commissionPct={Number((profile as any).commission_pct ?? 0)}
          />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 italic">
            {isSelf ? "Gerencie seu próprio acesso em Meu Perfil." : "Sem permissão para gerenciar este usuário."}
          </p>
        )}
      </div>
    </div>
  )
}
