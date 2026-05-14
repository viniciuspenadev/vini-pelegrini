import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { CashFlowChart } from "@/components/financial/cash-flow-chart"
import {
  ChevronLeft, ChevronRight, LineChart, TrendingUp, TrendingDown,
  Wallet, ArrowRight, AlertCircle,
} from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_LONG = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

export default async function FluxoCaixaPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  // Período: últimos 30 dias + próximos 60
  const now = new Date()
  const fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 30)
  const toDate   = new Date(now); toDate.setDate(toDate.getDate() + 60)

  const fromStr = fromDate.toISOString().split("T")[0]
  const toStr   = toDate.toISOString().split("T")[0]
  const today   = now.toISOString().split("T")[0]

  const [
    { data: receivables },
    { data: payables },
    { data: transactions },
    { data: bankAccounts },
  ] = await Promise.all([
    supabaseAdmin
      .from("accounts_receivable")
      .select("amount, paid_amount, due_date, paid_at, status")
      .eq("tenant_id", session.user.tenantId)
      .gte("due_date", fromStr)
      .lte("due_date", toStr),

    supabaseAdmin
      .from("accounts_payable")
      .select("amount, paid_amount, due_date, paid_at, status")
      .eq("tenant_id", session.user.tenantId)
      .gte("due_date", fromStr)
      .lte("due_date", toStr),

    supabaseAdmin
      .from("financial_transactions")
      .select("type, amount, transaction_date")
      .eq("tenant_id", session.user.tenantId)
      .gte("transaction_date", fromStr)
      .lte("transaction_date", toStr)
      .order("transaction_date"),

    supabaseAdmin
      .from("bank_accounts")
      .select("current_balance")
      .eq("tenant_id", session.user.tenantId)
      .eq("active", true),
  ])

  const saldoAtual = (bankAccounts ?? []).reduce((s, a) => s + Number(a.current_balance), 0)

  // ─── Construção da série diária ───
  const dayMap: Record<string, { date: string; entradas: number; saidas: number; previsto_in: number; previsto_out: number }> = {}

  function ensure(date: string) {
    if (!dayMap[date]) dayMap[date] = { date, entradas: 0, saidas: 0, previsto_in: 0, previsto_out: 0 }
    return dayMap[date]
  }

  // Realizadas (financial_transactions)
  for (const t of transactions ?? []) {
    const d = ensure(t.transaction_date)
    if (t.type === "entrada")       d.entradas += Number(t.amount)
    else if (t.type === "saida")    d.saidas   += Number(t.amount)
  }

  // Previsões futuras (em aberto)
  for (const r of receivables ?? []) {
    if (r.status === "pago" || r.status === "cancelado") continue
    if (r.due_date < today) continue   // já vencido, conta como atraso
    const remaining = Number(r.amount) - Number(r.paid_amount ?? 0)
    if (remaining <= 0) continue
    ensure(r.due_date).previsto_in += remaining
  }

  for (const p of payables ?? []) {
    if (p.status === "pago" || p.status === "cancelado") continue
    if (p.due_date < today) continue
    const remaining = Number(p.amount) - Number(p.paid_amount ?? 0)
    if (remaining <= 0) continue
    ensure(p.due_date).previsto_out += remaining
  }

  // Garante todos os dias do período
  const cursor = new Date(fromDate)
  while (cursor <= toDate) {
    ensure(cursor.toISOString().split("T")[0])
    cursor.setDate(cursor.getDate() + 1)
  }

  const series = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))

  // Saldo projetado: parte do saldo atual e aplica entradas/saídas (realizadas + previstas)
  let saldo = saldoAtual
  const seriesWithBalance = series.map((d) => {
    // Pra dias passados, o saldo já está nas bank_accounts. Para futuro, projetamos.
    if (d.date > today) {
      saldo += d.previsto_in - d.previsto_out
    }
    return { ...d, saldo_projetado: saldo }
  })

  // KPIs agregados
  const total30dEntradas = seriesWithBalance.reduce((s, d) => s + d.entradas, 0)
  const total30dSaidas   = seriesWithBalance.reduce((s, d) => s + d.saidas, 0)
  const total60dPrevIn   = seriesWithBalance.filter((d) => d.date > today).reduce((s, d) => s + d.previsto_in, 0)
  const total60dPrevOut  = seriesWithBalance.filter((d) => d.date > today).reduce((s, d) => s + d.previsto_out, 0)
  const saldoFinal       = seriesWithBalance[seriesWithBalance.length - 1]?.saldo_projetado ?? saldoAtual

  const saldoFicarNegativo = seriesWithBalance.find((d) => d.date > today && d.saldo_projetado < 0)

  return (
    <div className="min-h-full bg-blue-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/financeiro" className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors">
            <ChevronLeft className="size-4 text-slate-600" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span>Financeiro</span>
              <ChevronRight className="size-3" />
              <span className="text-slate-600 font-medium">Fluxo de Caixa</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fluxo de caixa</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Últimos 30 dias + projeção para os próximos 60 dias
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* Alerta saldo negativo projetado */}
        {saldoFicarNegativo && (
          <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 flex items-start gap-3">
            <div className="size-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="size-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Saldo negativo projetado</p>
              <p className="text-xs text-red-700 mt-0.5">
                Em <strong>{DATE_LONG(new Date(saldoFicarNegativo.date + "T12:00:00"))}</strong> o saldo
                projetado ficaria em <strong>{BRL(saldoFicarNegativo.saldo_projetado)}</strong>.
                Antecipe recebimentos ou negocie pagamentos.
              </p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">Saldo atual</p>
              <span className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Wallet className="size-4" /></span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">{BRL(saldoAtual)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">Entradas (30d)</p>
              <span className="size-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><TrendingUp className="size-4" /></span>
            </div>
            <p className="text-2xl font-bold text-green-700 tabular-nums mt-2">{BRL(total30dEntradas)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Previsto: {BRL(total60dPrevIn)} próximos 60d</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">Saídas (30d)</p>
              <span className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><TrendingDown className="size-4" /></span>
            </div>
            <p className="text-2xl font-bold text-red-700 tabular-nums mt-2">{BRL(total30dSaidas)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Previsto: {BRL(total60dPrevOut)} próximos 60d</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">Saldo projetado</p>
              <span className="size-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><ArrowRight className="size-4" /></span>
            </div>
            <p className={`text-2xl font-bold tabular-nums mt-2 ${saldoFinal < 0 ? "text-red-600" : "text-slate-900"}`}>{BRL(saldoFinal)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Em 60 dias</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <LineChart className="size-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">Evolução diária</p>
            <span className="ml-auto text-[11px] text-slate-400">
              {DATE_LONG(fromDate)} → {DATE_LONG(toDate)}
            </span>
          </div>
          <div className="p-5">
            <CashFlowChart data={seriesWithBalance} today={today} />
          </div>
        </div>
      </div>
    </div>
  )
}
