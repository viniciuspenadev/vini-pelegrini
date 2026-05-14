import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ReceivableActions } from "@/components/financial/receivable-actions"
import {
  ChevronLeft, ChevronRight, Calendar, Receipt, Building2, Tag,
  CreditCard, FileText, AlertCircle, CheckCircle2, Clock, XCircle, Hash,
  ArrowUpRight, Users, MinusCircle,
} from "lucide-react"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE_LONG = (d: string) =>
  new Date(d.length > 10 ? d : d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })

const DATE_SHORT = (d: string) =>
  new Date(d.length > 10 ? d : d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })

const TIME_HM = (d: string) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

function relativeDate(dateStr: string): { label: string; severity: "ok" | "warn" | "danger" | "neutral" } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + "T12:00:00")
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0)  return { label: "vence hoje",                     severity: "warn" }
  if (diffDays === 1)  return { label: "vence amanhã",                   severity: "warn" }
  if (diffDays > 1)    return { label: `vence em ${diffDays} dias`,      severity: "ok" }
  if (diffDays === -1) return { label: "vencido ontem",                  severity: "danger" }
  return                       { label: `vencido há ${-diffDays} dias`,  severity: "danger" }
}

const STATUS_META: Record<string, { label: string; color: string; dot: string; icon: React.ElementType; iconBg: string }> = {
  aberto:    { label: "Em aberto",  color: "text-blue-700 bg-blue-50 border-blue-200",     dot: "bg-blue-500",  icon: Clock,        iconBg: "bg-blue-50 text-blue-600" },
  parcial:   { label: "Parcial",    color: "text-amber-700 bg-amber-50 border-amber-200",  dot: "bg-amber-500", icon: AlertCircle,  iconBg: "bg-amber-50 text-amber-600" },
  pago:      { label: "Pago",       color: "text-green-700 bg-green-50 border-green-200",  dot: "bg-green-500", icon: CheckCircle2, iconBg: "bg-green-50 text-green-600" },
  vencido:   { label: "Vencido",    color: "text-red-700 bg-red-50 border-red-200",        dot: "bg-red-500",   icon: AlertCircle,  iconBg: "bg-red-50 text-red-600" },
  cancelado: { label: "Cancelado",  color: "text-slate-500 bg-slate-100 border-slate-200", dot: "bg-slate-400", icon: XCircle,      iconBg: "bg-slate-100 text-slate-500" },
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX", boleto: "Boleto", transferencia: "Transferência",
  dinheiro: "Dinheiro", cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito", cheque: "Cheque", outros: "Outros",
}

export default async function ReceivableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const [{ data: receivable }, { data: bankAccounts }] = await Promise.all([
    supabaseAdmin
      .from("accounts_receivable")
      .select(`
        *,
        customers ( id, razao_social, nome_fantasia, cnpj_cpf, telefone, email_financeiro, email_nfe, limite_credito ),
        financial_categories ( id, name, type ),
        bank_accounts ( id, name )
      `)
      .eq("id", id)
      .eq("tenant_id", session.user.tenantId)
      .single(),
    supabaseAdmin
      .from("bank_accounts")
      .select("id, name")
      .eq("tenant_id", session.user.tenantId)
      .eq("active", true)
      .order("name"),
  ])

  if (!receivable) notFound()

  const r = receivable as any
  const customer = r.customers
  const category = r.financial_categories
  const bankAccount = r.bank_accounts

  // Busca o pedido se houver origem
  let order: any = null
  let orderTotalPaid: number = 0
  let orderTotalReceivables: number = 0
  if (r.origin_type === "order" && r.origin_id) {
    const { data: orderData } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, final_total_amount, estimated_total_amount, created_at, delivery_date")
      .eq("id", r.origin_id)
      .eq("tenant_id", session.user.tenantId)
      .maybeSingle()
    order = orderData

    // Soma total de receivables vinculados ao mesmo pedido (sumário das outras parcelas)
    if (order) {
      const { data: siblings } = await supabaseAdmin
        .from("accounts_receivable")
        .select("amount, paid_amount, status")
        .eq("origin_type", "order")
        .eq("origin_id", r.origin_id)
        .eq("tenant_id", session.user.tenantId)
      orderTotalPaid       = (siblings ?? []).reduce((s, x) => s + Number(x.paid_amount ?? 0), 0)
      orderTotalReceivables = (siblings ?? []).filter((x) => x.status !== "cancelado").reduce((s, x) => s + Number(x.amount), 0)
    }
  }

  // Transações vinculadas (pagamentos)
  const { data: transactions } = await supabaseAdmin
    .from("financial_transactions")
    .select("id, amount, transaction_date, description, type, created_at, bank_accounts ( name )")
    .eq("receivable_id", id)
    .eq("tenant_id", session.user.tenantId)
    .order("transaction_date", { ascending: false })

  const meta        = STATUS_META[r.status] ?? STATUS_META.aberto
  const StatusIcon  = meta.icon
  const remaining   = Number(r.amount) - Number(r.paid_amount ?? 0)
  const relInfo     = r.status === "pago" ? null : relativeDate(r.due_date)
  const isOverdue   = relInfo?.severity === "danger" && r.status !== "cancelado"
  const customerName = customer?.nome_fantasia || customer?.razao_social || "—"

  return (
    <div className="min-h-full bg-blue-50">

      {/* Sticky topbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-3.5 flex items-center gap-3">
        <Link
          href="/financeiro/recebimentos"
          className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors"
        >
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-xs min-w-0">
          <Link href="/financeiro" className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">Financeiro</Link>
          <ChevronRight className="size-3 text-slate-300 shrink-0" />
          <Link href="/financeiro/recebimentos" className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">Recebimentos</Link>
          <ChevronRight className="size-3 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-900 truncate">{r.description}</span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* ── HERO ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
          {/* Strip de status */}
          <div className={`h-1 ${meta.dot}`} />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
                    <span className={`size-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  {r.installment_seq && r.installment_total && r.installment_total > 1 && (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                      Parcela {r.installment_seq}/{r.installment_total}
                    </span>
                  )}
                  {r.origin_type === "order" && (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      <Receipt className="size-3 mr-1" /> Origem: pedido
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 truncate">{r.description}</p>

                {/* Big value */}
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl sm:text-5xl font-bold text-slate-900 tabular-nums tracking-tight">{BRL(Number(r.amount))}</p>
                  {Number(r.paid_amount) > 0 && r.status !== "pago" && (
                    <p className="text-sm text-slate-400">
                      Pago <span className="font-semibold text-amber-600">{BRL(Number(r.paid_amount))}</span> · Resta <span className="font-semibold text-slate-700">{BRL(remaining)}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="size-4 text-slate-400" />
                  <span>Vencimento <span className="font-semibold text-slate-700">{DATE_LONG(r.due_date)}</span></span>
                  {relInfo && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      relInfo.severity === "danger" ? "bg-red-50 text-red-700"
                      : relInfo.severity === "warn" ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>
                      {relInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <ReceivableActions
                receivableId={r.id}
                receivableDescription={r.description}
                remainingAmount={remaining}
                bankAccounts={(bankAccounts ?? []) as any}
                status={r.status}
              />
            </div>
          </div>
        </div>

        {/* ── GRID PRINCIPAL ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* COLUNA ESQUERDA — Timeline + Atividade */}
          <div className="lg:col-span-8 space-y-4">

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Clock className="size-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Linha do tempo</p>
              </div>

              <div className="p-5">
                <ol className="relative space-y-5">
                  {/* Linha vertical */}
                  <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200" aria-hidden />

                  {/* Criado */}
                  <li className="relative flex gap-4">
                    <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-blue-50 border-2 border-white shrink-0 ring-1 ring-blue-100">
                      <FileText className="size-3.5 text-blue-600" />
                    </span>
                    <div className="flex-1 min-w-0 pb-2">
                      <p className="text-sm font-medium text-slate-900">Recebimento criado</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {DATE_LONG(r.created_at)} às {TIME_HM(r.created_at)}
                        {r.origin_type === "order" && order && (
                          <> · gerado pelo pedido #{String(order.order_number).padStart(4, "0")}</>
                        )}
                        {r.origin_type === "manual" && <> · lançamento manual</>}
                      </p>
                    </div>
                  </li>

                  {/* Vencimento */}
                  <li className="relative flex gap-4">
                    <span className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-white shrink-0 ring-1 ${
                      isOverdue ? "bg-red-50 ring-red-100" : "bg-slate-100 ring-slate-200"
                    }`}>
                      <Calendar className={`size-3.5 ${isOverdue ? "text-red-600" : "text-slate-500"}`} />
                    </span>
                    <div className="flex-1 min-w-0 pb-2">
                      <p className={`text-sm font-medium ${isOverdue ? "text-red-700" : "text-slate-900"}`}>
                        Vencimento
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {DATE_LONG(r.due_date)}
                        {relInfo && <> · {relInfo.label}</>}
                      </p>
                    </div>
                  </li>

                  {/* Transactions (pagamentos) */}
                  {(transactions ?? []).map((t: any) => (
                    <li key={t.id} className="relative flex gap-4">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-green-50 border-2 border-white shrink-0 ring-1 ring-green-100">
                        <CheckCircle2 className="size-3.5 text-green-600" />
                      </span>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">Pagamento registrado</p>
                          <p className="text-sm font-bold text-green-700 tabular-nums">+{BRL(Number(t.amount))}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {DATE_SHORT(t.transaction_date)}
                          {t.bank_accounts?.name && <> · {t.bank_accounts.name}</>}
                        </p>
                      </div>
                    </li>
                  ))}

                  {/* Estado terminal */}
                  {r.status === "pago" && r.paid_at && (transactions ?? []).length === 0 && (
                    <li className="relative flex gap-4">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-green-50 border-2 border-white shrink-0 ring-1 ring-green-100">
                        <CheckCircle2 className="size-3.5 text-green-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700">Pago</p>
                        <p className="text-xs text-slate-400 mt-0.5">{DATE_LONG(r.paid_at)}</p>
                      </div>
                    </li>
                  )}

                  {r.status === "cancelado" && (
                    <li className="relative flex gap-4">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-slate-100 border-2 border-white shrink-0 ring-1 ring-slate-200">
                        <XCircle className="size-3.5 text-slate-500" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">Cancelado</p>
                        <p className="text-xs text-slate-400 mt-0.5">{DATE_LONG(r.updated_at)}</p>
                      </div>
                    </li>
                  )}

                  {/* Próximo passo previsto (se ainda não pago/cancelado) */}
                  {!["pago", "cancelado"].includes(r.status) && (
                    <li className="relative flex gap-4">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white border-2 border-dashed border-slate-300 shrink-0">
                        <CheckCircle2 className="size-3.5 text-slate-300" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-400">Aguardando pagamento</p>
                        <p className="text-xs text-slate-400 mt-0.5">Próximo passo da jornada</p>
                      </div>
                    </li>
                  )}
                </ol>
              </div>
            </div>

            {/* Observações */}
            {r.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="size-3.5 text-amber-600" />
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Observações</p>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{r.notes}</p>
              </div>
            )}

            {/* Atividade financeira (transactions) */}
            {(transactions ?? []).length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <ArrowUpRight className="size-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">Movimentações vinculadas</p>
                  <span className="ml-auto text-[11px] text-slate-400">{(transactions ?? []).length} registro{(transactions ?? []).length === 1 ? "" : "s"}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(transactions ?? []).map((t: any) => (
                    <div key={t.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="size-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {DATE_SHORT(t.transaction_date)}
                          {t.bank_accounts?.name && <> · {t.bank_accounts.name}</>}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-green-700 tabular-nums whitespace-nowrap">+{BRL(Number(t.amount))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA — Cards de contexto */}
          <div className="lg:col-span-4 space-y-4">

            {/* Cliente */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Users className="size-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Cliente</p>
              </div>
              <div className="p-5 space-y-3">
                <Link href={customer?.id ? `/clientes/${customer.id}` : "#"} className="group flex items-center gap-3 -mx-1 -my-1 p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="size-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-600">{customerName?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{customerName}</p>
                    {customer?.cnpj_cpf && (
                      <p className="text-[11px] font-mono text-slate-400 truncate">{customer.cnpj_cpf}</p>
                    )}
                  </div>
                  <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </Link>

                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  {customer?.telefone && (
                    <p className="text-[11px] text-slate-500">Tel: {customer.telefone}</p>
                  )}
                  {(customer?.email_nfe || customer?.email_financeiro) && (
                    <p className="text-[11px] text-slate-500 truncate">
                      {customer.email_nfe || customer.email_financeiro}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pedido origem */}
            {order && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Receipt className="size-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">Pedido de origem</p>
                </div>
                <div className="p-5 space-y-3">
                  <Link href={`/pedidos/${order.id}`} className="group flex items-center justify-between -mx-1 -my-1 p-1 rounded-lg hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-lg font-bold text-slate-900 tabular-nums group-hover:text-blue-700 transition-colors">
                        #{String(order.order_number).padStart(4, "0")}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{DATE_SHORT(order.created_at.split("T")[0])}</p>
                    </div>
                    <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </Link>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Total do pedido</span>
                      <span className="font-semibold text-slate-900 tabular-nums">{BRL(Number(order.final_total_amount ?? order.estimated_total_amount))}</span>
                    </div>
                    {orderTotalReceivables > 0 && (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Total a receber (todas parcelas)</span>
                          <span className="font-medium text-slate-700 tabular-nums">{BRL(orderTotalReceivables)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Já recebido</span>
                          <span className={`font-semibold tabular-nums ${orderTotalPaid > 0 ? "text-green-600" : "text-slate-400"}`}>
                            {BRL(orderTotalPaid)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detalhes financeiros */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Hash className="size-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Detalhes</p>
              </div>
              <div className="p-5 space-y-2.5">
                {category && (
                  <DetailRow icon={<Tag className="size-3.5" />} label="Categoria" value={category.name} />
                )}
                {r.payment_method && (
                  <DetailRow icon={<CreditCard className="size-3.5" />} label="Forma" value={PAYMENT_LABEL[r.payment_method] ?? r.payment_method} />
                )}
                {bankAccount && (
                  <DetailRow icon={<Building2 className="size-3.5" />} label="Conta de baixa" value={bankAccount.name} />
                )}
                {r.installment_total && r.installment_total > 1 && (
                  <DetailRow icon={<MinusCircle className="size-3.5" />} label="Parcela" value={`${r.installment_seq}/${r.installment_total}`} />
                )}
                {r.paid_at && (
                  <DetailRow icon={<CheckCircle2 className="size-3.5" />} label="Pago em" value={DATE_SHORT(r.paid_at)} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-slate-400">
        {icon}
        {label}
      </span>
      <span className="font-medium text-slate-700 text-right truncate">{value}</span>
    </div>
  )
}
