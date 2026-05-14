"use client"

import { useState, useMemo } from "react"
import { Search, Check, Inbox, AlertCircle, Calendar, ChevronRight } from "lucide-react"
import { MarkPaidModal } from "./mark-paid-modal"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  aberto:    { label: "Aberto",    cls: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  parcial:   { label: "Parcial",   cls: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  pago:      { label: "Pago",      cls: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500" },
  vencido:   { label: "Vencido",   cls: "bg-red-50 text-red-700 border-red-200",        dot: "bg-red-500" },
  cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
}

const FILTER_TABS = [
  { value: "todos",     label: "Todos" },
  { value: "aberto",    label: "Abertos" },
  { value: "vencido",   label: "Vencidos" },
  { value: "pago",      label: "Pagos" },
  { value: "cancelado", label: "Cancelados" },
]

interface Item {
  id: string
  description: string
  supplier_name: string
  amount: number
  paid_amount: number
  due_date: string
  paid_at: string | null
  status: string
  payment_method: string | null
  document_type: string | null
  document_number: string | null
}

interface Props {
  items:        Item[]
  bankAccounts: { id: string; name: string }[]
  initialStatus?: string
}

const inputBase = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

export function PagamentosList({ items, bankAccounts, initialStatus }: Props) {
  const [search, setSearch] = useState("")
  const [tab, setTab]       = useState(initialStatus ?? "todos")
  const [modalItem, setModalItem] = useState<Item | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((r) => {
      if (tab !== "todos" && r.status !== tab) return false
      if (!q) return true
      return r.description.toLowerCase().includes(q) || r.supplier_name.toLowerCase().includes(q)
    })
  }, [items, search, tab])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: items.length }
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1
    return c
  }, [items])

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por fornecedor ou descrição..."
              className={`${inputBase} pl-9`}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 overflow-x-auto">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.value
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.value ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                {counts[t.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum lançamento</p>
            <p className="text-xs text-slate-400">
              {tab === "todos" ? "Crie o primeiro pagamento." : "Ajuste o filtro para ver outros lançamentos."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden md:grid grid-cols-[1fr_180px_110px_130px_120px_40px] gap-3 px-5 py-2.5 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Descrição</span>
              <span>Fornecedor</span>
              <span>Vencimento</span>
              <span className="text-right">Valor</span>
              <span>Status</span>
              <span />
            </div>

            {filtered.map((r) => {
              const meta = STATUS_META[r.status] ?? STATUS_META.aberto
              const canMarkPaid = r.status !== "pago" && r.status !== "cancelado"
              const today = new Date().toISOString().split("T")[0]
              const isOverdue = r.due_date < today && canMarkPaid

              return (
                <div
                  key={r.id}
                  className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_180px_110px_130px_120px_40px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{r.description}</p>
                    {(r.document_type || r.document_number) && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {r.document_type ?? ""} {r.document_number ?? ""}
                      </p>
                    )}
                  </div>

                  <p className="hidden md:block text-xs text-slate-600 truncate">{r.supplier_name}</p>

                  <p className={`hidden md:flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                    <Calendar className="size-3 shrink-0" />
                    {DATE_SHORT(r.due_date)}
                    {isOverdue && <AlertCircle className="size-3 shrink-0" />}
                  </p>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">{BRL(r.amount)}</p>
                    {r.paid_amount > 0 && r.paid_amount < r.amount && (
                      <p className="text-[10px] text-amber-600 mt-0.5">Pago: {BRL(r.paid_amount)}</p>
                    )}
                    <p className="md:hidden text-[10px] text-slate-400 mt-0.5 truncate">
                      {r.supplier_name} · {DATE_SHORT(r.due_date)}
                    </p>
                  </div>

                  <div className="hidden md:block">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      <span className={`size-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="hidden md:flex justify-end">
                    {canMarkPaid ? (
                      <button
                        onClick={() => setModalItem(r)}
                        title="Dar baixa"
                        className="size-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                    ) : (
                      <ChevronRight className="size-3.5 text-slate-300" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalItem && (
        <MarkPaidModal
          open={true}
          onClose={() => setModalItem(null)}
          kind="payable"
          itemId={modalItem.id}
          description={modalItem.description}
          amount={Number(modalItem.amount) - Number(modalItem.paid_amount ?? 0)}
          bankAccounts={bankAccounts}
        />
      )}
    </>
  )
}
