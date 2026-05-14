import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import {
  ChevronLeft, ChevronRight, Plus, CreditCard, Building2,
  Wallet, PiggyBank, Smartphone,
} from "lucide-react"
import type { BankAccount } from "@/types/database"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  corrente:         { label: "Corrente",         icon: Building2, color: "bg-blue-50 text-blue-600 border-blue-100" },
  poupanca:         { label: "Poupança",         icon: PiggyBank, color: "bg-green-50 text-green-600 border-green-100" },
  caixa:            { label: "Caixa",            icon: Wallet,    color: "bg-amber-50 text-amber-600 border-amber-100" },
  pix:              { label: "PIX",              icon: Smartphone,color: "bg-violet-50 text-violet-600 border-violet-100" },
  carteira_digital: { label: "Carteira Digital", icon: Smartphone,color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
  outros:           { label: "Outros",           icon: CreditCard,color: "bg-slate-100 text-slate-500 border-slate-200" },
}

export default async function ContasBancariasPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const { data: accounts } = await supabaseAdmin
    .from("bank_accounts")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .order("active", { ascending: false })
    .order("name")

  const all      = (accounts ?? []) as BankAccount[]
  const ativas   = all.filter((a) => a.active)
  const total    = ativas.reduce((s, a) => s + Number(a.current_balance), 0)

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/financeiro" className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors">
            <ChevronLeft className="size-4 text-slate-600" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span>Financeiro</span>
              <ChevronRight className="size-3" />
              <span className="text-slate-600 font-medium">Contas Bancárias</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contas bancárias</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {ativas.length} ativa{ativas.length !== 1 ? "s" : ""} · Saldo total {BRL(total)}
            </p>
          </div>
        </div>
        <LinkButton
          href="/financeiro/contas/nova"
          className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg"
        >
          <Plus className="size-3.5" /> Nova conta
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-4">

        {all.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <CreditCard className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhuma conta cadastrada</p>
            <p className="text-xs text-slate-400 mb-4">
              Crie sua primeira conta bancária para registrar recebimentos e pagamentos.
            </p>
            <LinkButton
              href="/financeiro/contas/nova"
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold rounded-lg"
            >
              <Plus className="size-3.5" /> Adicionar conta
            </LinkButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {all.map((acc) => {
              const meta = TYPE_META[acc.type] ?? TYPE_META.outros
              const Icon = meta.icon
              return (
                <Link
                  key={acc.id}
                  href={`/financeiro/contas/${acc.id}`}
                  className={`group bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-3 hover:border-slate-300 transition-colors ${!acc.active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex items-center justify-center size-10 rounded-xl border ${meta.color}`}>
                      <Icon className="size-5" />
                    </span>
                    {!acc.active && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        inativa
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900 truncate">{acc.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {meta.label}
                      {acc.bank_name && ` · ${acc.bank_name}`}
                      {acc.agency && ` · Ag. ${acc.agency}`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400">Saldo</span>
                    <span className={`text-base font-bold tabular-nums ${Number(acc.current_balance) < 0 ? "text-red-600" : "text-slate-900"}`}>
                      {BRL(Number(acc.current_balance))}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
