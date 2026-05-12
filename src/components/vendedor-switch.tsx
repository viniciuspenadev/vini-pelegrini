"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateCustomerVendedor } from "@/lib/actions/vendedor"
import { Button } from "@/components/ui/button"
import { Check, X, Pencil, User } from "lucide-react"

interface Vendedor { id: string; full_name: string | null; email: string }

interface Props {
  customerId: string
  current:    Vendedor | null
  vendedores: Vendedor[]
}

const selectClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"

export function VendedorSwitch({ customerId, current, vendedores }: Props) {
  const router               = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, start]     = useTransition()
  const [selected, setSelected] = useState<string>(current?.id ?? "")

  function handleSave() {
    start(async () => {
      await updateCustomerVendedor(customerId, selected || null)
      setEditing(false)
      router.refresh()
    })
  }

  function handleCancel() {
    setSelected(current?.id ?? "")
    setEditing(false)
  }

  const displayName = current?.full_name ?? current?.email ?? null
  const initial     = displayName?.[0]?.toUpperCase() ?? "?"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Vendedor responsável</p>
        {!editing && vendedores.length > 0 && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil className="size-3" /> Trocar
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={pending} className="h-6 px-2 text-xs gap-1 text-slate-500">
              <X className="size-3" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={pending} className="h-6 px-2 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Check className="size-3" /> {pending ? "..." : "Confirmar"}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className={selectClass} autoFocus>
          <option value="">— Sem responsável —</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.full_name ?? v.email}</option>
          ))}
        </select>
      ) : displayName ? (
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-blue-600">{initial}</span>
          </div>
          <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400">
          <User className="size-4" />
          <p className="text-sm italic text-slate-400">Sem responsável</p>
        </div>
      )}
    </div>
  )
}
