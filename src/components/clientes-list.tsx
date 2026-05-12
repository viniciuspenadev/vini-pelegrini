"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  ChevronRight, Search, X, Plus, Users,
  MapPin, Truck, CreditCard, UserCircle2,
} from "lucide-react"
import { LinkButton } from "@/components/ui/link-button"

const GRID_ADMIN = "44px 1fr 200px 160px 110px 20px"
const GRID_VEND  = "44px 1fr 200px 110px 20px"

type StatusTab = "todos" | "ativo" | "inativo" | "bloqueado"

const TABS: { key: StatusTab; label: string }[] = [
  { key: "todos",     label: "Todos"     },
  { key: "ativo",     label: "Ativos"    },
  { key: "inativo",   label: "Inativos"  },
  { key: "bloqueado", label: "Bloqueados" },
]

interface Customer {
  id:                string
  razao_social:      string
  nome_fantasia:     string | null
  cnpj_cpf:          string
  cidade:            string | null
  estado:            string | null
  rota_entrega:      string | null
  forma_pagamento:   string | null
  status:            string
  vendedor?:         { full_name: string | null; email: string | null } | null
}

interface Props {
  customers:    Customer[]
  isAdminOrOwner: boolean
}

export function ClientesList({ customers, isAdminOrOwner }: Props) {
  const [search, setSearch]   = useState("")
  const [tab, setTab]         = useState<StatusTab>("todos")

  const counts = useMemo(() => ({
    todos:     customers.length,
    ativo:     customers.filter((c) => c.status === "ativo").length,
    inativo:   customers.filter((c) => c.status === "inativo").length,
    bloqueado: customers.filter((c) => c.status === "bloqueado").length,
  }), [customers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter((c) => {
      if (tab !== "todos" && c.status !== tab) return false
      if (!q) return true
      const nome   = (c.nome_fantasia || c.razao_social).toLowerCase()
      const razao  = c.razao_social.toLowerCase()
      const cnpj   = c.cnpj_cpf.replace(/\D/g, "")
      const cidade = (c.cidade ?? "").toLowerCase()
      return nome.includes(q) || razao.includes(q) || cnpj.includes(q.replace(/\D/g, "")) || cidade.includes(q)
    })
  }, [customers, search, tab])

  const GRID = isAdminOrOwner ? GRID_ADMIN : GRID_VEND

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
        <Users className="size-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum cliente cadastrado</p>
        <p className="text-xs text-slate-400 mb-4">Comece adicionando seu primeiro cliente.</p>
        <LinkButton href="/clientes/novo" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold rounded-lg">
          <Plus className="size-3.5" /> Adicionar cliente
        </LinkButton>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Search + status tabs */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou cidade..."
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

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-card shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className={`text-[10px] font-bold tabular-nums ${
                tab === t.key ? "text-blue-200" : "text-slate-400"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {(search || tab !== "todos") && (
        <p className="text-xs text-slate-400 px-1">
          {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
          {search && <span> para <span className="font-medium text-slate-600">"{search}"</span></span>}
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-400">
            Nenhum cliente encontrado{search && <span> para <span className="font-medium text-slate-600">"{search}"</span></span>}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">

          {/* Column headers — desktop */}
          <div
            className="hidden md:grid items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: GRID }}
          >
            <span />
            <span>Cliente</span>
            <span>Localização / Rota</span>
            {isAdminOrOwner && <span>Vendedor</span>}
            <span className="text-center">Status</span>
            <span />
          </div>

          {filtered.map((c, i) => {
            const nome    = c.nome_fantasia || c.razao_social
            const initial = nome[0]?.toUpperCase() ?? "?"
            const isLast  = i === filtered.length - 1
            const isBlocked = c.status === "bloqueado"

            const vendorName = c.vendedor?.full_name || c.vendedor?.email || null

            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className={`group flex md:grid items-center gap-3 px-5 py-3.5 transition-colors ${!isLast ? "border-b border-slate-100" : ""} ${
                  isBlocked ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-slate-50"
                }`}
                style={{ gridTemplateColumns: GRID } as React.CSSProperties}
              >
                {/* Avatar */}
                <div className="hidden md:flex justify-center">
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isBlocked
                      ? "bg-red-50 border-red-200"
                      : "bg-blue-50 border-blue-100"
                  }`}>
                    <span className={`text-xs font-bold ${isBlocked ? "text-red-500" : "text-blue-600"}`}>
                      {initial}
                    </span>
                  </div>
                </div>

                {/* Cliente — main info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate leading-none">{nome}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] font-mono text-slate-400">{c.cnpj_cpf}</span>
                    {c.nome_fantasia && c.razao_social !== c.nome_fantasia && (
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">{c.razao_social}</span>
                    )}
                    {/* Mobile chips */}
                    <div className="flex md:hidden items-center gap-1.5 mt-0.5">
                      {c.rota_entrega && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          <Truck className="size-2.5" />{c.rota_entrega}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Localização / Rota — desktop */}
                <div className="hidden md:flex flex-col gap-1">
                  {(c.cidade || c.estado) && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="size-3 text-slate-300 shrink-0" />
                      {[c.cidade, c.estado].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.rota_entrega && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        <Truck className="size-2.5" />{c.rota_entrega}
                      </span>
                    )}
                    {c.forma_pagamento && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        <CreditCard className="size-2.5" />{c.forma_pagamento}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vendedor — desktop, admin only */}
                {isAdminOrOwner && (
                  <div className="hidden md:flex items-center gap-1.5">
                    {vendorName ? (
                      <>
                        <UserCircle2 className="size-3.5 text-slate-300 shrink-0" />
                        <span className="text-xs text-slate-500 truncate">{vendorName}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                )}

                {/* Status */}
                <div className="hidden md:flex justify-center">
                  <StatusBadge status={c.status} className="text-[10px] font-semibold px-2.5 py-1 rounded-md" />
                </div>

                {/* Mobile: status on the right */}
                <div className="flex md:hidden items-center gap-2 ml-auto shrink-0">
                  <StatusBadge status={c.status} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" />
                </div>

                <ChevronRight className="hidden md:block size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
