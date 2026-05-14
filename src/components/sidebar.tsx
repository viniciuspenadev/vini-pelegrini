"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useMemo, useEffect } from "react"
import {
  LogOut, LayoutDashboard, ShoppingCart, Package, Wallet,
  Receipt, Settings2, ChevronDown,
  ClipboardList, FileEdit, Users, Box, Tag, BadgeDollarSign,
  TrendingUp, TrendingDown, LineChart,
  Settings, FileCheck, FileX, UserCog, CreditCard, ScrollText,
  MessageCircle, Inbox, Contact, Megaphone,
} from "lucide-react"

interface NavItem {
  label: string
  href:  string
  icon:  React.ReactNode
  soon?: boolean
}

interface NavGroup {
  key:        string
  label:      string
  icon:       React.ReactNode
  href?:      string
  soon?:      boolean
  adminOnly?: boolean
  fiscalRole?: boolean
  children?:  NavItem[]
}

const subIcon = "w-4 h-4 shrink-0"

const NAV: NavGroup[] = [
  {
    key:   "painel",
    label: "Painel",
    href:  "/",
    icon:  <LayoutDashboard className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    key:   "vendas",
    label: "Vendas",
    icon:  <ShoppingCart className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    children: [
      { label: "Pedidos",    href: "/pedidos",    icon: <ClipboardList className={subIcon} strokeWidth={1.75} /> },
      { label: "Orçamentos", href: "/orcamentos", icon: <FileEdit      className={subIcon} strokeWidth={1.75} />, soon: true },
      { label: "Clientes",   href: "/clientes",   icon: <Users         className={subIcon} strokeWidth={1.75} /> },
    ],
  },
  {
    key:   "catalogo",
    label: "Catálogo",
    icon:  <Package className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    children: [
      { label: "Produtos",         href: "/produtos",      icon: <Box             className={subIcon} strokeWidth={1.75} /> },
      { label: "Categorias",       href: "/categorias",    icon: <Tag             className={subIcon} strokeWidth={1.75} />, soon: true },
      { label: "Tabelas de Preço", href: "/tabelas-preco", icon: <BadgeDollarSign className={subIcon} strokeWidth={1.75} />, soon: true },
    ],
  },
  {
    key:   "marketing",
    label: "Marketing",
    icon:  <MessageCircle className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    children: [
      { label: "Inbox",         href: "/marketing",              icon: <Inbox     className={subIcon} strokeWidth={1.75} /> },
      { label: "Contatos",      href: "/marketing/contatos",     icon: <Contact   className={subIcon} strokeWidth={1.75} /> },
      { label: "Campanhas",     href: "/marketing/campanhas",    icon: <Megaphone className={subIcon} strokeWidth={1.75} />, soon: true },
      { label: "Configuração",  href: "/marketing/configuracao", icon: <Settings  className={subIcon} strokeWidth={1.75} /> },
    ],
  },
  {
    key:   "financeiro",
    label: "Financeiro",
    icon:  <Wallet className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    fiscalRole: true,
    children: [
      { label: "Visão Geral",      href: "/financeiro",              icon: <LayoutDashboard className={subIcon} strokeWidth={1.75} /> },
      { label: "Contas a Receber", href: "/financeiro/recebimentos", icon: <TrendingUp     className={subIcon} strokeWidth={1.75} /> },
      { label: "Contas a Pagar",   href: "/financeiro/pagamentos",   icon: <TrendingDown   className={subIcon} strokeWidth={1.75} /> },
      { label: "Fluxo de Caixa",   href: "/financeiro/fluxo",        icon: <LineChart      className={subIcon} strokeWidth={1.75} /> },
      { label: "Contas Bancárias", href: "/financeiro/contas",       icon: <CreditCard     className={subIcon} strokeWidth={1.75} /> },
    ],
  },
  {
    key:        "fiscal",
    label:      "Fiscal",
    icon:       <Receipt className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    fiscalRole: true,
    children: [
      { label: "Configuração",   href: "/configuracoes/fiscal",   icon: <Settings  className={subIcon} strokeWidth={1.75} /> },
      { label: "NF-e Emitidas",  href: "/fiscal/nfe",              icon: <FileCheck className={subIcon} strokeWidth={1.75} />, soon: true },
      { label: "Inutilizações",  href: "/fiscal/inutilizacoes",    icon: <FileX     className={subIcon} strokeWidth={1.75} />, soon: true },
    ],
  },
  {
    key:       "admin",
    label:     "Administração",
    icon:      <Settings2 className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    adminOnly: true,
    children: [
      { label: "Usuários",  href: "/usuarios",  icon: <UserCog    className={subIcon} strokeWidth={1.75} /> },
      { label: "Plano",     href: "/plano",     icon: <CreditCard className={subIcon} strokeWidth={1.75} />, soon: true },
      { label: "Auditoria", href: "/auditoria", icon: <ScrollText className={subIcon} strokeWidth={1.75} />, soon: true },
    ],
  },
]

interface SidebarProps {
  userName:   string
  userEmail:  string
  tenantName: string
  userRole:   string
}

export function Sidebar({ userName, userEmail, tenantName, userRole }: SidebarProps) {
  const pathname              = usePathname()
  const [signing, setSigning] = useState(false)
  const isAdminOrOwner        = ["owner", "admin"].includes(userRole)
  const canViewFiscal         = ["owner", "admin", "financeiro"].includes(userRole)

  // Filter visible groups by role
  const visibleNav = useMemo(() => {
    return NAV.filter((g) => {
      if (g.adminOnly  && !isAdminOrOwner) return false
      if (g.fiscalRole && !canViewFiscal)  return false
      return true
    })
  }, [isAdminOrOwner, canViewFiscal])

  const isItemActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  const isGroupActive = (group: NavGroup) => {
    if (group.href && isItemActive(group.href)) return true
    return group.children?.some((c) => isItemActive(c.href)) ?? false
  }

  // Initially expand the group containing the current route
  const [open, setOpen] = useState<Set<string>>(() => {
    const found = visibleNav.find((g) => g.children && isGroupActive(g))
    return found ? new Set([found.key]) : new Set<string>()
  })

  // Auto-open active group when navigating (preserves manually-opened groups)
  useEffect(() => {
    const activeGroup = visibleNav.find((g) => g.children && isGroupActive(g))
    if (activeGroup) {
      setOpen((prev) => prev.has(activeGroup.key) ? prev : new Set([...prev, activeGroup.key]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggleGroup(key: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSignOut() {
    setSigning(true)
    await signOut({ redirectTo: "/auth/signin" })
  }

  return (
    <aside className="group/sb flex flex-col bg-white border-r border-slate-200 shrink-0 h-screen overflow-hidden z-20
      w-16 hover:w-64 transition-[width] duration-200 ease-in-out">

      {/* Brand */}
      <div className="flex items-center h-14 border-b border-slate-200 px-2.5 shrink-0 overflow-hidden">
        <div className="flex size-11 items-center justify-center shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-600/30">
            <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex flex-col min-w-0 overflow-hidden opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
          <span className="text-sm font-bold text-slate-900 whitespace-nowrap leading-tight">PedidosPro</span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap truncate leading-tight mt-0.5">{tenantName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-1">
        {visibleNav.map((group) => {
          const hasChildren = !!group.children?.length
          const groupActive = isGroupActive(group)
          const isOpen      = open.has(group.key)

          // Leaf: no children, direct link
          if (!hasChildren) {
            const active = group.href ? isItemActive(group.href) : false
            return (
              <Link
                key={group.key}
                href={group.soon ? "#" : (group.href ?? "#")}
                title={group.label}
                className={`group/item relative flex items-center gap-3 rounded-xl py-1.5 pr-3 ${group.soon ? "cursor-default" : ""}`}
              >
                {/* Icon pill */}
                <span className={`
                  flex size-11 items-center justify-center rounded-xl shrink-0 transition-all duration-150
                  ${active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : group.soon
                    ? "text-slate-300"
                    : "text-slate-500 group-hover/item:bg-slate-100 group-hover/item:text-slate-900"
                  }
                `}>
                  {group.icon}
                </span>
                <span className={`
                  whitespace-nowrap text-sm font-medium opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75
                  ${active ? "text-blue-700" : group.soon ? "text-slate-300" : "text-slate-700"}
                `}>
                  {group.label}
                </span>
              </Link>
            )
          }

          // Parent group with children
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={isOpen}
                title={group.label}
                className="group/item relative w-full flex items-center gap-3 rounded-xl py-1.5 pr-3"
              >
                {/* Icon pill — active state when a child is active */}
                <span className={`
                  flex size-11 items-center justify-center rounded-xl shrink-0 transition-all duration-150
                  ${groupActive
                    ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
                    : "text-slate-500 group-hover/item:bg-slate-100 group-hover/item:text-slate-900"
                  }
                `}>
                  {group.icon}
                </span>

                {/* Label + chevron — hidden when collapsed */}
                <span className={`
                  whitespace-nowrap text-sm font-medium flex-1 text-left opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75
                  ${groupActive ? "text-blue-700" : "text-slate-700"}
                `}>
                  {group.label}
                </span>
                {group.soon && (
                  <span className="whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
                    breve
                  </span>
                )}
                <ChevronDown
                  className={`size-3.5 text-slate-400 shrink-0 transition-transform duration-200 opacity-0 group-hover/sb:opacity-100 delay-75 ${isOpen ? "rotate-180" : ""}`}
                  strokeWidth={2.5}
                />
              </button>

              {/* Subitems — hidden completely when sidebar collapsed */}
              <div
                className={`
                  overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out max-h-0 opacity-0
                  ${isOpen ? "group-hover/sb:max-h-96 group-hover/sb:opacity-100" : ""}
                `}
              >
                <div className="mt-1 mb-1 ml-5 pl-3 border-l border-slate-200 space-y-0.5">
                  {group.children!.map((item) => {
                    const active = isItemActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.soon ? "#" : item.href}
                        title={item.label}
                        className={`
                          group/sub flex items-center gap-2.5 rounded-lg pl-2 pr-3 py-1.5 text-[13px] transition-colors overflow-hidden
                          ${active
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : item.soon
                            ? "text-slate-300 cursor-default"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          }
                        `}
                      >
                        <span className={`shrink-0 ${active ? "text-blue-600" : item.soon ? "text-slate-300" : "text-slate-400 group-hover/sub:text-slate-600"}`}>
                          {item.icon}
                        </span>
                        <span className="whitespace-nowrap flex-1 opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
                          {item.label}
                        </span>
                        {item.soon && (
                          <span className="whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
                            breve
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Bottom: profile */}
      <div className="px-2.5 pb-3 pt-2 border-t border-slate-200 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 py-1 overflow-hidden">
          <Link
            href="/perfil"
            title="Meu perfil"
            className="group/profile flex size-11 items-center justify-center shrink-0 rounded-xl transition-colors hover:bg-slate-100"
          >
            <div className="size-8 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white shadow-sm shadow-blue-600/20">
              <span className="text-xs font-bold text-white">{userName?.[0]?.toUpperCase() ?? "U"}</span>
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
            className="shrink-0 size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30 opacity-0 group-hover/sb:opacity-100 duration-150 delay-75"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
