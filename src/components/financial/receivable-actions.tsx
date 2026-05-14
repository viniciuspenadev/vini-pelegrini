"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Check, MoreHorizontal, MessageCircle, XCircle, Loader2 } from "lucide-react"
import { MarkPaidModal } from "./mark-paid-modal"
import { cancelReceivable } from "@/lib/actions/financial"

interface Props {
  receivableId:          string
  receivableDescription: string
  remainingAmount:       number
  bankAccounts:          { id: string; name: string }[]
  status:                string
}

export function ReceivableActions({
  receivableId, receivableDescription, remainingAmount, bankAccounts, status,
}: Props) {
  const [showPayModal, setShowPayModal] = useState(false)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pending, startTransition]      = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  const canPay    = !["pago", "cancelado"].includes(status)
  const canCancel = !["pago", "cancelado"].includes(status)

  function handleCancel() {
    startTransition(async () => {
      await cancelReceivable(receivableId)
      setConfirmCancel(false)
      setMenuOpen(false)
    })
  }

  if (status === "pago") {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-700 border border-green-200">
        <Check className="size-4" strokeWidth={2.5} />
        <span className="text-sm font-semibold">Pagamento recebido</span>
      </div>
    )
  }

  if (status === "cancelado") {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
        <XCircle className="size-4" />
        <span className="text-sm font-semibold">Cancelado</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        {canPay && (
          <button
            type="button"
            onClick={() => setShowPayModal(true)}
            className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-sm shadow-green-600/20"
          >
            <Check className="size-4" strokeWidth={2.5} />
            Dar baixa
          </button>
        )}

        <button
          type="button"
          disabled
          title="Disponível em breve (Fase 3 — Cobrança ativa)"
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold bg-white text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
        >
          <MessageCircle className="size-4" />
          Cobrar
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="size-10 rounded-xl bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <MoreHorizontal className="size-4" />
          </button>

          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-20">
              {confirmCancel ? (
                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-600">Tem certeza? Esta ação não pode ser desfeita.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      disabled={pending}
                      className="flex-1 h-7 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={pending}
                      className="flex-1 h-7 text-[11px] font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                      {pending && <Loader2 className="size-3 animate-spin" />}
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="py-1.5 text-sm">
                  {canCancel && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(true)}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <XCircle className="size-3.5" />
                        Cancelar recebimento
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {showPayModal && (
        <MarkPaidModal
          open={showPayModal}
          onClose={() => setShowPayModal(false)}
          kind="receivable"
          itemId={receivableId}
          description={receivableDescription}
          amount={remainingAmount}
          bankAccounts={bankAccounts}
        />
      )}
    </>
  )
}
