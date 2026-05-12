"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { X, Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "",                       label: "Todos" },
  { value: "recebido",               label: "Recebido" },
  { value: "em_separacao",           label: "Em Separação" },
  { value: "aguardando_faturamento", label: "Ag. Faturamento" },
  { value: "faturado",               label: "Faturado" },
  { value: "em_rota",                label: "Em Rota" },
  { value: "entregue",               label: "Entregue" },
  { value: "cancelado",              label: "Cancelado" },
]

interface Seller { id: string; name: string }

interface Props {
  status?:       string
  data?:         string
  vendedor?:     string
  sellers?:      Seller[]
  showSellers:   boolean
  activeFilters: number
  statusCounts?: Record<string, number>
}

function buildUrl(current: Record<string, string | undefined>, key: string, value: string) {
  const params = new URLSearchParams()
  const merged = { ...current, [key]: value }
  Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
  const qs = params.toString()
  return `/pedidos${qs ? `?${qs}` : ""}`
}

export function PedidosFilters({ status, data, vendedor, sellers, showSellers, activeFilters, statusCounts = {} }: Props) {
  const router  = useRouter()
  const current = { status, data, vendedor }

  const hasSecondary = data || (showSellers && sellers && sellers.length > 0) || activeFilters > 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      {/* Status pills */}
      <div className="flex items-center gap-1 px-4 py-3 overflow-x-auto">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = status === opt.value || (!status && opt.value === "")
          return (
            <Link
              key={opt.value}
              href={buildUrl(current, "status", opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {opt.label}
              {opt.value !== "" && (statusCounts[opt.value] ?? 0) > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {statusCounts[opt.value]}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Secondary filters */}
      {hasSecondary && (
        <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50 flex-wrap">
          {/* Data de entrega */}
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-slate-400 shrink-0" />
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Entrega:</label>
            <input
              type="date"
              defaultValue={data ?? ""}
              onChange={(e) => router.push(buildUrl(current, "data", e.target.value))}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Vendedor */}
          {showSellers && sellers && sellers.length > 0 && (
            <div className="flex items-center gap-2">
              <User className="size-3.5 text-slate-400 shrink-0" />
              <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Vendedor:</label>
              <select
                defaultValue={vendedor ?? ""}
                onChange={(e) => router.push(buildUrl(current, "vendedor", e.target.value))}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Todos</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Limpar filtros */}
          {activeFilters > 0 && (
            <Link
              href="/pedidos"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-300 transition-colors ml-auto"
            >
              <X className="size-3" /> Limpar filtros
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
