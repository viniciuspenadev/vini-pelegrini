"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

const ROUTE_LABELS: Record<string, string> = {
  "/":           "Painel",
  "/pedidos":    "Pedidos",
  "/clientes":   "Clientes",
  "/produtos":   "Produtos",
  "/usuarios":   "Usuários",
  "/perfil":     "Meu Perfil",
  "/financeiro": "Financeiro",
}

function getLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  const parent = "/" + pathname.split("/")[1]
  return ROUTE_LABELS[parent] ?? ""
}

interface Props {
  userName: string
  userRole: string
}

export function Topbar({ userName, userRole }: Props) {
  const pathname = usePathname()
  const label    = getLabel(pathname)
  const isHome   = pathname === "/"
  const initial  = userName?.[0]?.toUpperCase() ?? "U"

  const ROLE_LABELS: Record<string, string> = {
    owner:      "Proprietário",
    admin:      "Administrador",
    vendedor:   "Vendedor",
    financeiro: "Financeiro",
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
          <Home className="size-4" />
        </Link>
        {!isHome && label && (
          <>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="font-medium text-slate-700">{label}</span>
          </>
        )}
        {isHome && (
          <>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="font-medium text-slate-700">Página Inicial</span>
          </>
        )}
      </div>

      {/* Right side */}
      <Link
        href="/perfil"
        className="flex items-center gap-2.5 group"
      >
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-slate-700 leading-none group-hover:text-blue-600 transition-colors">
            {userName}
          </p>
          <p className="text-[11px] text-slate-400 leading-none mt-0.5">
            {ROLE_LABELS[userRole] ?? userRole}
          </p>
        </div>
        <div className="size-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">{initial}</span>
        </div>
      </Link>
    </header>
  )
}
