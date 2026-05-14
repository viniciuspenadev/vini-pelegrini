import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import { RecebimentosList } from "@/components/financial/recebimentos-list"
import { ChevronLeft, ChevronRight, Plus, TrendingUp } from "lucide-react"

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default async function RecebimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const { status: filterStatus } = await searchParams

  const today = new Date().toISOString().split("T")[0]

  // Marca vencidos antes de listar (DRY: usa a função SQL)
  await supabaseAdmin.rpc("mark_overdue_accounts")

  const [{ data: receivables }, { data: bankAccounts }] = await Promise.all([
    supabaseAdmin
      .from("accounts_receivable")
      .select(`
        id, customer_id, description, amount, paid_amount, due_date, paid_at,
        status, payment_method, installment_seq, installment_total, origin_type, origin_id,
        customers ( razao_social, nome_fantasia )
      `)
      .eq("tenant_id", session.user.tenantId)
      .order("due_date", { ascending: true })
      .limit(500),

    supabaseAdmin
      .from("bank_accounts")
      .select("id, name")
      .eq("tenant_id", session.user.tenantId)
      .eq("active", true)
      .order("name"),
  ])

  const all = (receivables ?? []) as any[]

  // KPIs
  const sumOpen = (rows: any[]) => rows.reduce((s, r) => s + (Number(r.amount) - Number(r.paid_amount ?? 0)), 0)

  const abertos     = all.filter((r) => r.status === "aberto" || r.status === "parcial")
  const vencidos    = all.filter((r) => r.status === "vencido" || ((r.status === "aberto" || r.status === "parcial") && r.due_date < today))
  const pagosMes    = all.filter((r) => r.status === "pago" && r.paid_at && r.paid_at >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const totalAbertos  = sumOpen(abertos)
  const totalVencidos = sumOpen(vencidos)
  const totalPagosMes = pagosMes.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0)

  return (
    <div className="min-h-full bg-blue-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/financeiro" className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors">
            <ChevronLeft className="size-4 text-slate-600" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span>Financeiro</span>
              <ChevronRight className="size-3" />
              <span className="text-slate-600 font-medium">Contas a Receber</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contas a receber</h1>
            <p className="text-xs text-slate-400 mt-0.5">{all.length} lançamento{all.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <LinkButton
          href="/financeiro/recebimentos/novo"
          className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg"
        >
          <Plus className="size-3.5" /> Novo recebimento
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">A receber em aberto</p>
              <span className="size-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">{BRL(totalAbertos)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{abertos.length} lançamento{abertos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">Vencidos</p>
              <span className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className={`text-2xl font-bold tabular-nums mt-2 ${totalVencidos > 0 ? "text-red-600" : "text-slate-900"}`}>{BRL(totalVencidos)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{vencidos.length} lançamento{vencidos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-slate-400">Recebido no mês</p>
              <span className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">{BRL(totalPagosMes)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{pagosMes.length} pago{pagosMes.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Lista client-side com filtros */}
        <RecebimentosList items={all} bankAccounts={bankAccounts ?? []} initialStatus={filterStatus} />
      </div>
    </div>
  )
}
