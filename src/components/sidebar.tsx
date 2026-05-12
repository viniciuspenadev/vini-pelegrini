"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import { LogOut } from "lucide-react"

const NAV = [
  {
    label: "Painel",
    href: "/",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Pedidos",
    href: "/pedidos",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Produtos",
    href: "/produtos",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    ),
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    soon: true,
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const USUARIOS_ICON = (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

interface SidebarProps {
  userName:   string
  userEmail:  string
  tenantName: string
  userRole:   string
}

export function Sidebar({ userName, userEmail, tenantName, userRole }: SidebarProps) {
  const pathname       = usePathname()
  const [signing, setSigning] = useState(false)
  const isAdminOrOwner = ["owner", "admin"].includes(userRole)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  async function handleSignOut() {
    setSigning(true)
    await signOut({ redirectTo: "/auth/signin" })
  }

  return (
    <aside className="group/sb flex flex-col bg-white border-r border-slate-200 shrink-0 h-screen overflow-hidden z-20
      w-16 hover:w-60 transition-[width] duration-200 ease-in-out">

      {/* Brand */}
      <div className="flex items-center h-14 border-b border-slate-200 px-3 gap-3 shrink-0 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0 overflow-hidden opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">PedidosPro</span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap truncate">{tenantName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {NAV.map((item) => {
          const active = !item.soon && isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.soon ? "#" : item.href}
              title={item.label}
              className={`
                flex items-center gap-3 rounded-lg pr-3 py-2 text-sm transition-colors overflow-hidden
                ${active
                  ? "bg-blue-50 text-blue-700"
                  : item.soon
                  ? "text-slate-300 cursor-default"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <span className={`w-10 flex items-center justify-center shrink-0 ${active ? "text-blue-600" : item.soon ? "text-slate-300" : "text-slate-400"}`}>
                {item.icon}
              </span>
              <span className="whitespace-nowrap font-medium opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
                {item.label}
              </span>
              {item.soon && (
                <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400 opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
                  Em breve
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 border-t border-slate-200 pt-2 space-y-0.5 shrink-0 overflow-hidden">
        {isAdminOrOwner && (
          <Link
            href="/usuarios"
            title="Usuários"
            className={`flex items-center gap-3 rounded-lg pr-3 py-2 text-sm transition-colors overflow-hidden ${
              isActive("/usuarios")
                ? "bg-blue-50 text-blue-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className={`w-10 flex items-center justify-center shrink-0 ${isActive("/usuarios") ? "text-blue-600" : "text-slate-400"}`}>
              {USUARIOS_ICON}
            </span>
            <span className="whitespace-nowrap font-medium opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
              Usuários
            </span>
          </Link>
        )}

        <div className="flex items-center gap-2 py-2 overflow-hidden" title={userName}>
          <Link href="/perfil" className="w-10 flex items-center justify-center shrink-0" title="Meu perfil">
            <div className="size-7 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">{userName?.[0]?.toUpperCase() ?? "U"}</span>
            </div>
          </Link>
          <div className="min-w-0 flex-1 overflow-hidden opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
            <Link href="/perfil" className="block group/user">
              <p className="text-xs font-semibold text-slate-700 truncate whitespace-nowrap group-hover/user:text-blue-600 transition-colors">
                {userName}
              </p>
              <p className="text-[11px] text-slate-400 truncate whitespace-nowrap leading-none mt-0.5">
                {userEmail}
              </p>
            </Link>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signing}
            title="Sair"
            className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors disabled:opacity-30 opacity-0 group-hover/sb:opacity-100 duration-150 delay-75"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
