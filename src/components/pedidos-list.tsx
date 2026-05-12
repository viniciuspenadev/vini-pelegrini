"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import { ChevronRight, Search, Truck, AlertCircle, ClipboardList, Plus, X, Zap } from "lucide-react"

const BRL = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86_400_000)
  if (days === 0) return "hoje"
  if (days === 1) return "ontem"
  if (days < 7) return `há ${days} dias`
  if (days < 30) return `há ${Math.floor(days / 7)} sem.`
  return `há ${Math.floor(days / 30)} meses`
}

const GRID = "48px 1fr 80px 130px 160px 110px 20px"

interface Props {
  orders:         any[]
  isAdminOrOwner: boolean
  hasFilters:     boolean
}

export function PedidosList({ orders, isAdminOrOwner, hasFilters }: Props) {
  const [search, setSearch] = useState("")
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const nome = (o.customers?.nome_fantasia || o.customers?.razao_social || "").toLowerCase()
      const num  = String(o.order_number ?? "")
      return nome.includes(q) || num.includes(q)
    })
  }, [orders, search])

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
        <ClipboardList className="size-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-900 mb-1">
          {hasFilters ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
        </p>
        <p className="text-xs text-slate-400 mb-4">
          {hasFilters ? "Tente ajustar os filtros acima." : "Crie o primeiro pedido do dia."}
        </p>
        {!hasFilters && (
          <LinkButton href="/pedidos/novo" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold rounded-lg">
            <Plus className="size-3.5" /> Criar pedido
          </LinkButton>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por cliente ou número do pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-card"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {search && (
        <p className="text-xs text-slate-400 px-1">
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"} para <span className="font-medium text-slate-600">"{search}"</span>
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-400">
            Nenhum pedido para <span className="font-medium text-slate-600">"{search}"</span>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">

          {/* Column headers — desktop only */}
          <div
            className="hidden md:grid items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: GRID }}
          >
            <span />
            <span>Cliente</span>
            <span className="text-center">Pedido</span>
            <span className="text-center">Entrega</span>
            <span className="text-center">Status</span>
            <span className="text-right">Valor</span>
            <span />
          </div>

          {filtered.map((o, i) => {
            const num       = String(o.order_number ?? 0).padStart(4, "0")
            const nome      = o.customers?.nome_fantasia || o.customers?.razao_social || "—"
            const initial   = nome[0]?.toUpperCase() ?? "?"
            const total     = o.final_total_amount ?? o.estimated_total_amount
            const isFinal   = o.final_total_amount != null
            const vendedor  = o.profiles?.full_name ?? o.profiles?.email ?? null
            const rota      = o.customers?.rota_entrega ?? null
            const isLast    = i === filtered.length - 1
            const isOverdue = !!(o.delivery_date &&
              o.delivery_date < today &&
              !["entregue", "cancelado"].includes(o.status))

            const rowBase   = `group transition-colors ${!isLast ? "border-b border-slate-100" : ""}`
            const rowColor  = isOverdue
              ? "bg-red-50/30 hover:bg-red-50/60 border-l-2 border-l-red-400"
              : "hover:bg-slate-50"

            const avatarBg  = isOverdue ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"
            const avatarTxt = isOverdue ? "text-red-500" : "text-blue-600"

            return (
              <Link key={o.id} href={`/pedidos/${o.id}`}>

                {/* ── Desktop row ── */}
                <div
                  className={`hidden md:grid items-center gap-3 px-5 py-3.5 ${rowBase} ${rowColor}`}
                  style={{ gridTemplateColumns: GRID }}
                >
                  {/* Avatar */}
                  <div className="flex justify-center">
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 border ${avatarBg}`}>
                      <span className={`text-xs font-bold ${avatarTxt}`}>{initial}</span>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate leading-none">{nome}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {rota && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                          <Truck className="size-2.5 shrink-0" />{rota}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {vendedor && <span className="text-slate-500">{vendedor} · </span>}
                        {timeAgo(o.created_at.split("T")[0])}
                      </span>
                    </div>
                  </div>

                  {/* Pedido */}
                  <p className="text-xs font-mono font-medium text-slate-500 text-center">#{num}</p>

                  {/* Entrega */}
                  <div className="flex flex-col items-center gap-0.5">
                    {o.delivery_date ? (
                      <>
                        <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                          {DATE_SHORT(o.delivery_date)}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                            <AlertCircle className="size-2.5 shrink-0" /> Atrasado
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>

                  {/* Status + prioridade */}
                  <div className="flex flex-col items-center gap-1">
                    <StatusBadge status={o.status} className="text-[10px] font-semibold px-2.5 py-1 rounded-md" />
                    {o.priority === "urgente" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                        <Zap className="size-2.5" /> URGENTE
                      </span>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums leading-none">
                      {total != null ? BRL(Number(total)) : "—"}
                    </p>
                    {!isFinal && total != null && (
                      <p className="text-[10px] text-slate-400 mt-0.5">estimado</p>
                    )}
                  </div>

                  <ChevronRight className={`size-3.5 transition-colors ${isOverdue ? "text-red-300 group-hover:text-red-500" : "text-slate-300 group-hover:text-blue-500"}`} />
                </div>

                {/* ── Mobile card ── */}
                <div className={`md:hidden flex items-start gap-3 px-4 py-3.5 ${rowBase} ${rowColor}`}>
                  <div className={`size-9 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${avatarBg}`}>
                    <span className={`text-xs font-bold ${avatarTxt}`}>{initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate leading-tight">{nome}</p>
                      <StatusBadge status={o.status} className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] text-slate-400">#{num}</span>
                      {o.delivery_date && (
                        <span className={`text-[11px] ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                          · {isOverdue ? "⚠ " : ""}{DATE_SHORT(o.delivery_date)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5">
                        {rota && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            <Truck className="size-2.5" />{rota}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">{timeAgo(o.created_at.split("T")[0])}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">
                        {total != null ? BRL(Number(total)) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
