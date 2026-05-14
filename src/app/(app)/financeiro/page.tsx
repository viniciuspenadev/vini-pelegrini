import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ensureFinancialBootstrap } from "@/lib/actions/financial"
import {
  TrendingUp, TrendingDown, LineChart, CreditCard, Wallet,
  AlertCircle, ChevronRight, Plus,
} from "lucide-react"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const FIRST_DAY_MONTH = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]
}

const TODAY = () => new Date().toISOString().split("T")[0]
const IN_30_DAYS = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split("T")[0]
}

export default async function FinanceiroHubPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) {
    redirect("/")
  }

  // Bootstrap: na primeira visita, popula categorias e config padrão
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("segment")
    .eq("id", session.user.tenantId)
    .single()

  await ensureFinancialBootstrap(session.user.tenantId, tenant?.segment ?? null)

  // KPIs em paralelo
  const today      = TODAY()
  const monthStart = FIRST_DAY_MONTH()
  const in30days   = IN_30_DAYS()

  const [
    { data: receivablesAbertas },
    { data: receivablesMes },
    { data: payablesAbertas },
    { data: payablesMes },
    { data: bankAccounts },
    { data: vencidosReceber },
    { data: vencidosPagar },
  ] = await Promise.all([
    // A receber em aberto (próximos 30 dias)
    supabaseAdmin
      .from("accounts_receivable")
      .select("amount, paid_amount")
      .eq("tenant_id", session.user.tenantId)
      .in("status", ["aberto", "parcial"])
      .gte("due_date", today)
      .lte("due_date", in30days),

    // Recebido no mês
    supabaseAdmin
      .from("accounts_receivable")
      .select("paid_amount")
      .eq("tenant_id", session.user.tenantId)
      .eq("status", "pago")
      .gte("paid_at", monthStart),

    // A pagar em aberto (próximos 30 dias)
    supabaseAdmin
      .from("accounts_payable")
      .select("amount, paid_amount")
      .eq("tenant_id", session.user.tenantId)
      .in("status", ["aberto", "parcial"])
      .gte("due_date", today)
      .lte("due_date", in30days),

    // Pago no mês
    supabaseAdmin
      .from("accounts_payable")
      .select("paid_amount")
      .eq("tenant_id", session.user.tenantId)
      .eq("status", "pago")
      .gte("paid_at", monthStart),

    // Saldo total das contas bancárias
    supabaseAdmin
      .from("bank_accounts")
      .select("id, name, current_balance")
      .eq("tenant_id", session.user.tenantId)
      .eq("active", true)
      .order("name"),

    // Vencidos a receber
    supabaseAdmin
      .from("accounts_receivable")
      .select("id, amount, paid_amount", { count: "exact" })
      .eq("tenant_id", session.user.tenantId)
      .in("status", ["aberto", "parcial", "vencido"])
      .lt("due_date", today),

    // Vencidos a pagar
    supabaseAdmin
      .from("accounts_payable")
      .select("id, amount, paid_amount", { count: "exact" })
      .eq("tenant_id", session.user.tenantId)
      .in("status", ["aberto", "parcial", "vencido"])
      .lt("due_date", today),
  ])

  const sum = (rows: any[] | null, field: string) =>
    (rows ?? []).reduce((s, r) => s + Number(r[field] ?? 0), 0)

  const totalReceber  = sum(receivablesAbertas, "amount") - sum(receivablesAbertas, "paid_amount")
  const recebidoMes   = sum(receivablesMes, "paid_amount")
  const totalPagar    = sum(payablesAbertas, "amount") - sum(payablesAbertas, "paid_amount")
  const pagoMes       = sum(payablesMes, "paid_amount")
  const saldoTotal    = (bankAccounts ?? []).reduce((s, a) => s + Number(a.current_balance), 0)
  const vencidosRecv  = sum(vencidosReceber, "amount") - sum(vencidosReceber, "paid_amount")
  const vencidosPagvl = sum(vencidosPagar, "amount") - sum(vencidosPagar, "paid_amount")

  const hasNoBank = (bankAccounts ?? []).length === 0

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Wallet className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
            <p className="text-xs text-slate-400 mt-0.5">Recebimentos, pagamentos, fluxo de caixa e contas bancárias</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* Banner: sem conta bancária */}
        {hasNoBank && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="size-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Cadastre sua primeira conta bancária</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Você precisa de pelo menos uma conta para registrar recebimentos e pagamentos.
              </p>
            </div>
            <Link
              href="/financeiro/contas"
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              <Plus className="size-3.5" /> Adicionar conta
            </Link>
          </div>
        )}

        {/* KPIs principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Saldo em conta"
            value={BRL(saldoTotal)}
            icon={<Wallet className="size-4" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            sub={`${(bankAccounts ?? []).length} ${(bankAccounts ?? []).length === 1 ? "conta" : "contas"}`}
            href="/financeiro/contas"
          />
          <KpiCard
            label="A receber (30d)"
            value={BRL(totalReceber)}
            icon={<TrendingUp className="size-4" />}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            sub={`Recebido no mês: ${BRL(recebidoMes)}`}
            href="/financeiro/recebimentos"
          />
          <KpiCard
            label="A pagar (30d)"
            value={BRL(totalPagar)}
            icon={<TrendingDown className="size-4" />}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            sub={`Pago no mês: ${BRL(pagoMes)}`}
            href="/financeiro/pagamentos"
          />
          <KpiCard
            label="Resultado do mês"
            value={BRL(recebidoMes - pagoMes)}
            icon={<LineChart className="size-4" />}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            sub={recebidoMes - pagoMes >= 0 ? "Positivo" : "Negativo"}
            href="/financeiro/fluxo"
            valueColor={recebidoMes - pagoMes >= 0 ? "text-green-600" : "text-red-600"}
          />
        </div>

        {/* Alertas de vencidos */}
        {(vencidosRecv > 0 || vencidosPagvl > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vencidosRecv > 0 && (
              <Link
                href="/financeiro/recebimentos?status=vencido"
                className="bg-white rounded-xl border-2 border-red-200 p-4 flex items-center gap-3 hover:bg-red-50/40 transition-colors"
              >
                <div className="size-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="size-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Recebimentos vencidos</p>
                  <p className="text-lg font-bold text-red-600 tabular-nums">{BRL(vencidosRecv)}</p>
                </div>
                <ChevronRight className="size-4 text-slate-300" />
              </Link>
            )}
            {vencidosPagvl > 0 && (
              <Link
                href="/financeiro/pagamentos?status=vencido"
                className="bg-white rounded-xl border-2 border-amber-200 p-4 flex items-center gap-3 hover:bg-amber-50/40 transition-colors"
              >
                <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="size-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Pagamentos vencidos</p>
                  <p className="text-lg font-bold text-amber-600 tabular-nums">{BRL(vencidosPagvl)}</p>
                </div>
                <ChevronRight className="size-4 text-slate-300" />
              </Link>
            )}
          </div>
        )}

        {/* Contas bancárias */}
        {(bankAccounts ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Contas bancárias</h2>
              </div>
              <Link
                href="/financeiro/contas"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Gerenciar <ChevronRight className="size-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(bankAccounts ?? []).map((acc: any) => (
                <div key={acc.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <CreditCard className="size-3.5 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 flex-1 truncate">{acc.name}</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">{BRL(Number(acc.current_balance))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atalhos rápidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Ações rápidas</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <QuickAction href="/financeiro/recebimentos/novo" label="Lançar recebimento" icon={<TrendingUp className="size-4" />} color="green" />
            <QuickAction href="/financeiro/pagamentos/novo"   label="Lançar pagamento"   icon={<TrendingDown className="size-4" />} color="red" />
            <QuickAction href="/financeiro/contas/nova"       label="Nova conta"         icon={<CreditCard className="size-4" />} color="blue" />
            <QuickAction href="/financeiro/fluxo"             label="Ver fluxo de caixa" icon={<LineChart className="size-4" />} color="violet" />
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, icon, iconBg, iconColor, sub, href, valueColor = "text-slate-900",
}: {
  label: string; value: string; icon: React.ReactNode; iconBg: string; iconColor: string;
  sub: string; href: string; valueColor?: string
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-3 hover:border-slate-300 transition-colors"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] text-slate-400 leading-tight">{label}</p>
        <span className={`size-8 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </Link>
  )
}

function QuickAction({
  href, label, icon, color,
}: {
  href: string; label: string; icon: React.ReactNode; color: "green" | "red" | "blue" | "violet"
}) {
  const colors = {
    green:  "bg-green-50 text-green-700 hover:bg-green-100",
    red:    "bg-red-50 text-red-700 hover:bg-red-100",
    blue:   "bg-blue-50 text-blue-700 hover:bg-blue-100",
    violet: "bg-violet-50 text-violet-700 hover:bg-violet-100",
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${colors[color]}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  )
}
