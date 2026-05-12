"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateUserRole, toggleUserActive, resetUserPassword } from "@/lib/actions/usuarios"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Power, KeyRound } from "lucide-react"

interface Props {
  userId:        string
  currentRole:   string
  isActive:      boolean
  isTargetOwner: boolean
  sessionRole:   string
}

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const inputClass  = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

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

export function UserActionsPanel({ userId, currentRole, isActive, isTargetOwner, sessionRole }: Props) {
  const router          = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newPwd, setNewPwd] = useState("")
  const [role, setRole] = useState(currentRole)

  const isOwnerSession  = sessionRole === "owner"
  const canChangeRole   = !isTargetOwner || isOwnerSession

  async function handleRoleChange() {
    setError(null)
    start(async () => {
      try {
        await updateUserRole(userId, role)
        router.refresh()
      } catch (e: any) { setError(e.message) }
    })
  }

  async function handleToggleActive() {
    setError(null)
    start(async () => {
      try {
        await toggleUserActive(userId, !isActive)
        router.refresh()
      } catch (e: any) { setError(e.message) }
    })
  }

  async function handleResetPassword() {
    if (!newPwd || newPwd.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return }
    setError(null)
    start(async () => {
      try {
        await resetUserPassword(userId, newPwd)
        setNewPwd("")
        router.refresh()
      } catch (e: any) { setError(e.message) }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Role */}
      {canChangeRole && (
        <Card icon={<ShieldCheck />} title="Papel no sistema">
          <div className="flex gap-3">
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
              {isOwnerSession && <option value="admin">Administrador</option>}
              <option value="vendedor">Vendedor</option>
              <option value="financeiro">Financeiro</option>
              {isOwnerSession && <option value="owner">Proprietário</option>}
            </select>
            <Button onClick={handleRoleChange} disabled={pending || role === currentRole} size="sm" className="shrink-0">
              Salvar
            </Button>
          </div>
        </Card>
      )}

      {/* Ativar / Desativar */}
      <Card icon={<Power />} title={isActive ? "Desativar acesso" : "Reativar acesso"}>
        <p className="text-sm text-muted-foreground mb-4">
          {isActive
            ? "O usuário perderá acesso imediatamente. Seus dados são mantidos."
            : "O usuário voltará a ter acesso ao sistema."}
        </p>
        <Button
          variant={isActive ? "destructive" : "default"}
          size="sm"
          onClick={handleToggleActive}
          disabled={pending}
        >
          {isActive ? "Desativar usuário" : "Reativar usuário"}
        </Button>
      </Card>

      {/* Reset de senha */}
      <Card icon={<KeyRound />} title="Redefinir senha">
        <div className="flex gap-3">
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Nova senha (mín. 8 caracteres)"
            className={inputClass}
          />
          <Button onClick={handleResetPassword} disabled={pending || !newPwd} size="sm" className="shrink-0">
            Redefinir
          </Button>
        </div>
      </Card>
    </div>
  )
}
