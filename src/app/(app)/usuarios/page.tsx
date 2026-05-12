import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getTenantUsers } from "@/lib/queries"
import { LinkButton } from "@/components/ui/link-button"
import { PageHeader } from "@/components/ui/page-header"
import { Plus, ShieldCheck, User, UserX } from "lucide-react"
import Link from "next/link"

const ROLE_LABELS: Record<string, string> = {
  owner:      "Proprietário",
  admin:      "Administrador",
  vendedor:   "Vendedor",
  financeiro: "Financeiro",
}

const ROLE_COLORS: Record<string, string> = {
  owner:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  vendedor:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  financeiro: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!["owner", "admin"].includes(session!.user.role)) redirect("/")

  const users = await getTenantUsers(session!.user.tenantId)

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Usuários"
        description={`${users.length} usuário${users.length !== 1 ? "s" : ""} no time`}
        action={
          <LinkButton href="/usuarios/novo">
            <Plus className="size-4" /> Novo usuário
          </LinkButton>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-12">Nenhum usuário encontrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-foreground">
                    {(u.full_name ?? u.email)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {u.full_name ?? "—"}
                    </p>
                    {u.id === session!.user.id && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">você</span>
                    )}
                    {!u.active && (
                      <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                        <UserX className="size-2.5" /> Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground"}`}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
                {u.id !== session!.user.id && (
                  <Link
                    href={`/usuarios/${u.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    Gerenciar
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
