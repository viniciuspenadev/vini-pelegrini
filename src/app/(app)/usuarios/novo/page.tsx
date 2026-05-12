import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { createUser } from "@/lib/actions/usuarios"
import { LinkButton } from "@/components/ui/link-button"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const inputClass  = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

export default async function NovoUsuarioPage() {
  const session = await auth()
  if (!["owner", "admin"].includes(session!.user.role)) redirect("/")

  const isOwner = session!.user.role === "owner"

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-background pb-20">
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton href="/usuarios" variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
          <ChevronLeft className="size-4" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <span>Usuários</span>
          <ChevronRight className="size-3.5 opacity-50" />
          <span className="text-foreground">Novo usuário</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm text-foreground">Dados do usuário</h2>
          </div>
          <form action={createUser} className="p-5 space-y-4">
            <Field label="Nome completo">
              <input name="full_name" type="text" required placeholder="João Silva" className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required placeholder="joao@empresa.com" className={inputClass} />
            </Field>
            <Field label="Senha temporária">
              <input name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={inputClass} />
              <p className="text-[11px] text-muted-foreground">O usuário pode alterar a senha em Meu Perfil após o primeiro acesso.</p>
            </Field>
            <Field label="Papel no sistema">
              <select name="role" defaultValue="vendedor" className={selectClass}>
                {isOwner && <option value="admin">Administrador</option>}
                <option value="vendedor">Vendedor</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <LinkButton href="/usuarios" variant="outline">Cancelar</LinkButton>
              <Button type="submit">Criar usuário</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
