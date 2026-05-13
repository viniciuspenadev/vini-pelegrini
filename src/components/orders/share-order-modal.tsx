"use client"

import { useState, useTransition } from "react"
import { Share2, X, Copy, Check, Loader2, Link2, Clock, Eye, RotateCcw, AlertTriangle } from "lucide-react"
import { generateOrderLink, revokeOrderLink } from "@/lib/actions/order-links"

const EXPIRY_OPTIONS = [
  { days: 7,  label: "7 dias"  },
  { days: 15, label: "15 dias" },
  { days: 30, label: "30 dias" },
  { days: 60, label: "60 dias" },
]

interface ExistingLink {
  id: string
  token: string
  expires_at: string
  views: number
}

interface Props {
  orderId: string
  orderNum: string
  existingLink?: ExistingLink | null
}

export function ShareOrderModal({ orderId, orderNum, existingLink }: Props) {
  const [open,        setOpen]        = useState(false)
  const [selectedDays, setSelected]   = useState(15)
  const [activeLink,  setActiveLink]  = useState<ExistingLink | null>(existingLink ?? null)
  const [copied,      setCopied]      = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [pending,     startTransition] = useTransition()

  const publicUrl = activeLink
    ? `${window.location.origin}/p/${activeLink.token}`
    : null

  const isExpired = activeLink
    ? new Date(activeLink.expires_at) < new Date()
    : false

  function handleOpen() {
    setOpen(true)
    setConfirmRevoke(false)
  }

  function handleClose() {
    setOpen(false)
    setConfirmRevoke(false)
  }

  function handleGenerate() {
    startTransition(async () => {
      const link = await generateOrderLink(orderId, selectedDays)
      setActiveLink(link as ExistingLink)
      setConfirmRevoke(false)
    })
  }

  function handleRevoke() {
    if (!activeLink) return
    startTransition(async () => {
      await revokeOrderLink(activeLink.id, orderId)
      setActiveLink(null)
      setConfirmRevoke(false)
    })
  }

  function handleCopy() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expDate = activeLink
    ? new Date(activeLink.expires_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : null

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
      >
        <Share2 className="size-3.5" />
        Compartilhar
      </button>

      {/* Backdrop + Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Share2 className="size-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Compartilhar pedido</h3>
                  <p className="text-[11px] text-slate-400">#{orderNum}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="size-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Active link view */}
              {activeLink && !isExpired ? (
                <div className="space-y-4">
                  {/* Link display */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Link público</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                        <Link2 className="size-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 truncate font-mono">{publicUrl}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className={`h-9 px-3.5 rounded-lg text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                          copied
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {copied ? (
                          <><Check className="size-3.5" /> Copiado</>
                        ) : (
                          <><Copy className="size-3.5" /> Copiar</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Válido até {expDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="size-3.5" />
                      {activeLink.views} {activeLink.views === 1 ? "visualização" : "visualizações"}
                    </span>
                  </div>

                  {/* Divider + regenerate */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600">Gerar novo link</p>
                    <div className="grid grid-cols-4 gap-2">
                      {EXPIRY_OPTIONS.map((o) => (
                        <button
                          key={o.days}
                          type="button"
                          onClick={() => setSelected(o.days)}
                          className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                            selectedDays === o.days
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={pending}
                      className="w-full h-9 rounded-lg text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-3.5" />}
                      Gerar novo link
                    </button>
                  </div>

                  {/* Revoke */}
                  <div className="border-t border-slate-100 pt-4">
                    {confirmRevoke ? (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700">O link atual será desativado permanentemente. Quem tiver o link não conseguirá mais acessar o documento.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmRevoke(false)}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleRevoke}
                            disabled={pending}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                          >
                            {pending ? <Loader2 className="size-3 animate-spin" /> : null}
                            Revogar link
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRevoke(true)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Revogar link atual
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* No link / expired — generate new */
                <div className="space-y-4">
                  {isExpired && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <Clock className="size-3.5 shrink-0" />
                      O link anterior expirou. Gere um novo.
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2.5">Validade do link</p>
                    <div className="grid grid-cols-4 gap-2">
                      {EXPIRY_OPTIONS.map((o) => (
                        <button
                          key={o.days}
                          type="button"
                          onClick={() => setSelected(o.days)}
                          className={`h-12 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            selectedDays === o.days
                              ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <span className={`text-base font-bold leading-none ${selectedDays === o.days ? "text-white" : "text-slate-900"}`}>
                            {o.days}
                          </span>
                          <span>dias</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    O destinatário poderá visualizar o pedido e baixar o PDF durante o período selecionado.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={pending}
                    className="w-full h-10 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pending ? (
                      <><Loader2 className="size-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><Link2 className="size-4" /> Gerar link público</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
