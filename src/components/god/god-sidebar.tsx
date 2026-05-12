"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import {
  LayoutDashboard, Building2, CreditCard,
  LogOut, Shield, ExternalLink,
} from "lucide-react"

const NAV = [
  { label: "Dashboard",  href: "/god",         icon: LayoutDashboard },
  { label: "Tenants",    href: "/god/tenants",  icon: Building2 },
  { label: "Planos",     href: "/god/planos",   icon: CreditCard },
]

interface Props { adminName: string; adminEmail: string }

export function GodSidebar({ adminName, adminEmail }: Props) {
  const pathname  = usePathname()
  const [signing, setSigning] = useState(false)

  const isActive = (href: string) =>
    href === "/god" ? pathname === "/god" : pathname.startsWith(href)

  return (
    <aside className="flex flex-col w-60 bg-slate-950 h-screen shrink-0 border-r border-slate-800">

      {/* Brand */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-slate-800 shrink-0">
        <div className="size-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
          <Shield className="size-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">God Mode</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Plataforma</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg pr-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <span className={`w-10 flex items-center justify-center shrink-0`}>
                <item.icon className={`size-4.5 ${active ? "text-violet-400" : "text-slate-500"}`} />
              </span>
              {item.label}
            </Link>
          )
        })}

        {/* Voltar para o app */}
        <div className="pt-3 mt-3 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg pr-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <span className="w-10 flex items-center justify-center shrink-0">
              <ExternalLink className="size-4 text-slate-600" />
            </span>
            Voltar ao app
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-2 py-2">
          <div className="w-10 flex items-center justify-center shrink-0">
            <div className="size-7 rounded-full bg-violet-700 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">
                {adminName?.[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 truncate">{adminName}</p>
            <p className="text-[11px] text-slate-500 truncate">{adminEmail}</p>
          </div>
          <button
            onClick={async () => { setSigning(true); await signOut({ redirectTo: "/auth/signin" }) }}
            disabled={signing}
            title="Sair"
            className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-30"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
