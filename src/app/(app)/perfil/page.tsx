import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { updateProfile, updatePassword } from "@/lib/actions/perfil"
import { Button } from "@/components/ui/button"
import { User, KeyRound } from "lucide-react"

const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const ROLE_LABELS: Record<string, string> = {
  owner:      "Proprietário",
  admin:      "Administrador",
  vendedor:   "Vendedor",
  financeiro: "Financeiro",
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default async function PerfilPage() {
  const session = await auth()

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", session!.user.id)
    .single()

  const initial = (profile?.full_name ?? profile?.email ?? "U")[0].toUpperCase()

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-background pb-20">
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <p className="text-sm font-semibold text-foreground">Meu Perfil</p>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">{initial}</span>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{profile?.full_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[session!.user.role] ?? session!.user.role}</p>
          </div>
        </div>

        {/* Dados pessoais */}
        <Card icon={<User />} title="Dados pessoais">
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <input
                name="full_name"
                type="text"
                required
                defaultValue={profile?.full_name ?? ""}
                placeholder="Seu nome"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input value={profile?.email ?? ""} disabled className={inputClass + " opacity-50 cursor-not-allowed"} readOnly />
              <p className="text-[11px] text-muted-foreground">O email não pode ser alterado por aqui.</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">Salvar alterações</Button>
            </div>
          </form>
        </Card>

        {/* Alterar senha */}
        <Card icon={<KeyRound />} title="Alterar senha">
          <form action={updatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha atual</label>
              <input name="current_password" type="password" required placeholder="••••••••" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <input name="new_password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
              <input name="confirm_password" type="password" required minLength={8} placeholder="Repita a nova senha" className={inputClass} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">Alterar senha</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
