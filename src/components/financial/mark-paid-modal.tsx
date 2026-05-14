"use client"

import { useState, useTransition } from "react"
import { X, Check, Loader2, CreditCard } from "lucide-react"
import { markReceivablePaid, markPayablePaid } from "@/lib/actions/financial"

interface BankAccountOption { id: string; name: string }

interface Props {
  open:        boolean
  onClose:     () => void
  kind:        "receivable" | "payable"
  itemId:      string
  description: string
  amount:      number
  bankAccounts: BankAccountOption[]
  defaultBankAccountId?: string | null
}

const PAYMENT_METHODS = [
  { value: "pix",            label: "PIX" },
  { value: "boleto",         label: "Boleto" },
  { value: "transferencia",  label: "Transferência" },
  { value: "dinheiro",       label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito",  label: "Cartão de Débito" },
  { value: "cheque",         label: "Cheque" },
  { value: "outros",         label: "Outros" },
]

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

export function MarkPaidModal({
  open, onClose, kind, itemId, description, amount, bankAccounts, defaultBankAccountId,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [bankAccountId, setBankAccountId] = useState(defaultBankAccountId ?? bankAccounts[0]?.id ?? "")
  const [paymentMethod, setPaymentMethod] = useState("pix")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0])

  if (!open) return null

  function handleConfirm() {
    if (!bankAccountId) return
    startTransition(async () => {
      const action = kind === "receivable" ? markReceivablePaid : markPayablePaid
      await action(itemId, bankAccountId, paidAt, paymentMethod)
      onClose()
    })
  }

  const isReceber = kind === "receivable"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`size-8 rounded-lg flex items-center justify-center ${isReceber ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              <Check className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Dar baixa em {isReceber ? "recebimento" : "pagamento"}
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Valor */}
          <div className={`rounded-xl ${isReceber ? "bg-green-50" : "bg-red-50"} p-4 text-center`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${isReceber ? "text-green-600" : "text-red-600"}`}>Valor</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${isReceber ? "text-green-700" : "text-red-700"}`}>{BRL(amount)}</p>
          </div>

          {/* Conta */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Conta {isReceber ? "que recebeu" : "que pagou"} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <CreditCard className="size-4" />
              </span>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className={`${inputBase} pl-9`}
                required
              >
                {bankAccounts.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Data do {isReceber ? "recebimento" : "pagamento"}</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className={inputBase}
            />
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Forma</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={inputBase}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/40">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-9 px-4 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !bankAccountId}
            className={`h-9 px-5 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
              isReceber ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {pending ? "Salvando..." : "Confirmar baixa"}
          </button>
        </div>
      </div>
    </div>
  )
}
