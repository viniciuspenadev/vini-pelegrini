import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { getTenantVendedores } from "@/lib/queries"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import {
  ChevronLeft, ChevronRight,
  User, Phone, Mail, MapPin, Truck, Clock,
  FileText, ShoppingCart, TrendingUp, Package2,
  Plus, Receipt, Building2, CreditCard, Pencil,
} from "lucide-react"
import Link from "next/link"
import { VendedorSwitch } from "@/components/vendedor-switch"
import type { Customer } from "@/types/database"

const BRL = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}

function CardHeader({
  title, action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {action}
    </div>
  )
}

const ORDER_GRID = "72px 1fr 120px 110px 20px"

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const session = await auth()
  const isAdminOrOwner = ["owner", "admin"].includes(session!.user.role)

  const [{ data: customer }, { data: orders }, { data: vendedorHistory }, vendedores] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("*, vendedor:profiles!customers_vendedor_id_fkey ( id, full_name, email )")
      .eq("id", id)
      .eq("tenant_id", session!.user.tenantId)
      .single(),
    supabaseAdmin
      .from("orders")
      .select("id, order_number, status, delivery_date, estimated_total_amount, final_total_amount, created_at, profiles!orders_owner_id_fkey ( full_name, email )")
      .eq("customer_id", id)
      .eq("tenant_id", session!.user.tenantId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("customer_vendedor_history")
      .select(`
        id, changed_at, notes,
        old_profile:profiles!cvh_old_fkey ( full_name, email ),
        new_profile:profiles!cvh_new_fkey ( full_name, email ),
        by_profile:profiles!cvh_by_fkey  ( full_name, email )
      `)
      .eq("customer_id", id)
      .order("changed_at", { ascending: false }),
    getTenantVendedores(session!.user.tenantId),
  ])

  if (!customer) notFound()

  const c            = customer as Customer & Record<string, any>
  const nomeExibicao = c.nome_fantasia || c.razao_social
  const ordersData   = orders ?? []

  const activeOrders = ordersData.filter((o) => !["cancelado", "entregue"].includes(o.status))
  const billedOrders = ordersData.filter((o) => o.status !== "cancelado")
  const receitaTotal = billedOrders.reduce((s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)
  const ticketMedio  = billedOrders.length > 0 ? receitaTotal / billedOrders.length : 0
  const creditoEmUso = activeOrders.reduce((s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)
  const limitePct    = c.limite_credito > 0 ? Math.min(100, (creditoEmUso / c.limite_credito) * 100) : 0

  const kpis = [
    { label: "Total pedidos",   value: String(ordersData.length),   icon: ShoppingCart, iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
    { label: "Receita total",   value: BRL(receitaTotal),           icon: TrendingUp,   iconBg: "bg-green-50",  iconColor: "text-green-600" },
    { label: "Ticket médio",    value: BRL(ticketMedio),            icon: Package2,     iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "Em andamento",    value: String(activeOrders.length), icon: Clock,        iconBg: "bg-amber-50",  iconColor: "text-amber-600" },
  ]

  return (
    <div className="min-h-full bg-blue-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton
          href="/clientes"
          className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center bg-slate-100 hover:bg-slate-200"
        >
          <ChevronLeft className="size-4" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          <span className="text-slate-400 shrink-0">Clientes</span>
          <ChevronRight className="size-3.5 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-900 truncate">{nomeExibicao}</span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <StatusBadge status={c.status} className="text-[11px] font-semibold px-2.5 py-1 rounded-md" />
          <LinkButton
            href={`/clientes/${id}/editar`}
            className="h-8 px-3 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg gap-1.5"
          >
            <Pencil className="size-3" /> Editar
          </LinkButton>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Coluna principal (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-card px-4 py-4 flex items-center gap-3.5">
                  <div className={`size-9 rounded-lg ${k.iconBg} flex items-center justify-center shrink-0`}>
                    <k.icon className={`size-4 ${k.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{k.label}</p>
                    <p className="text-lg font-bold text-slate-900 leading-tight tabular-nums truncate">{k.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pedidos do cliente */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-semibold text-slate-900">Pedidos</p>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600 tabular-nums">
                    {ordersData.length}
                  </span>
                </div>
                <LinkButton
                  href="/pedidos/novo"
                  className="h-7 px-2.5 text-xs gap-1 bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
                >
                  <Plus className="size-3" /> Novo pedido
                </LinkButton>
              </div>

              {ordersData.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-10">
                  Nenhum pedido registrado para este cliente.
                </p>
              ) : (
                <div>
                  <div
                    className="hidden sm:grid gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                    style={{ gridTemplateColumns: ORDER_GRID }}
                  >
                    <span>Pedido</span>
                    <span>Status</span>
                    <span className="text-right">Entrega</span>
                    <span className="text-right">Valor</span>
                    <span />
                  </div>

                  {ordersData.map((order, i) => {
                    const num     = String(order.order_number ?? 0).padStart(4, "0")
                    const total   = order.final_total_amount ?? order.estimated_total_amount
                    const isFinal = order.final_total_amount != null
                    const isLast  = i === ordersData.length - 1
                    return (
                      <Link
                        key={order.id}
                        href={`/pedidos/${order.id}`}
                        className={`group hidden sm:grid items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors ${!isLast ? "border-b border-slate-100" : ""}`}
                        style={{ gridTemplateColumns: ORDER_GRID }}
                      >
                        <span className="text-xs font-mono font-semibold text-slate-700">#{num}</span>
                        <div>
                          <StatusBadge status={order.status} className="text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit" />
                          {(order as any).profiles?.full_name && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <User className="size-2.5 text-slate-400 shrink-0" />
                              <p className="text-[10px] text-slate-400 truncate">
                                {(order as any).profiles.full_name}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 text-right">
                          {order.delivery_date ? DATE_SHORT(order.delivery_date) : <span className="text-slate-300">—</span>}
                        </p>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900 tabular-nums">{BRL(total)}</p>
                          {!isFinal && <p className="text-[10px] text-slate-400">estimado</p>}
                        </div>
                        <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <p className="text-xs text-slate-400 text-right px-1">
              Cadastrado em {DATE_SHORT(c.created_at.split("T")[0])} · Atualizado em {DATE_SHORT(c.updated_at.split("T")[0])}
            </p>
          </div>

          {/* ── Sidebar (1/3) ── */}
          <div className="space-y-4">

            {/* Contato */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <CardHeader title="Contato" />
              <div className="p-5 space-y-3.5">
                {c.telefone && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Phone className="size-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Telefone</p>
                      <p className="text-sm font-medium text-slate-900">{c.telefone}</p>
                    </div>
                  </div>
                )}
                {c.comprador_nome && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="size-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Comprador</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{c.comprador_nome}</p>
                    </div>
                  </div>
                )}
                {c.comprador_whatsapp && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Phone className="size-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">WhatsApp</p>
                      <p className="text-sm font-medium text-slate-900">{c.comprador_whatsapp}</p>
                    </div>
                  </div>
                )}
                {c.email_financeiro && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Mail className="size-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">E-mail financeiro</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{c.email_financeiro}</p>
                    </div>
                  </div>
                )}
                {c.email_nfe && c.email_nfe !== c.email_financeiro && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Receipt className="size-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">E-mail NF-e</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{c.email_nfe}</p>
                    </div>
                  </div>
                )}
                {!c.telefone && !c.comprador_nome && !c.comprador_whatsapp && !c.email_financeiro && (
                  <p className="text-sm text-slate-400 italic">Sem dados de contato.</p>
                )}
              </div>
            </div>

            {/* Dados Cadastrais */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <CardHeader title="Dados Cadastrais" />
              <div className="p-5 space-y-4">

                <div className="space-y-3">
                  <Field label="Razão Social" value={c.razao_social} />
                  {c.nome_fantasia && c.nome_fantasia !== c.razao_social && (
                    <Field label="Nome Fantasia" value={c.nome_fantasia} />
                  )}
                </div>

                {(c.cnpj_cpf || c.inscricao_estadual || c.isento_ie || c.regime_tributario) && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="space-y-3">
                      {c.cnpj_cpf && <Field label="CNPJ / CPF" value={c.cnpj_cpf} mono />}
                      {(c.isento_ie || c.inscricao_estadual) && (
                        <Field
                          label="Inscrição Estadual"
                          value={c.isento_ie ? "Isento" : (c.inscricao_estadual ?? "—")}
                        />
                      )}
                      {c.regime_tributario && (
                        <Field label="Regime Tributário" value={c.regime_tributario} />
                      )}
                      {c.contribuinte_icms && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
                          <Building2 className="size-3" />
                          Contribuinte de ICMS
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(c.logradouro || c.cidade || c.rota_entrega || c.janela_entrega) && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="space-y-3">
                      {c.logradouro ? (
                        <div className="flex items-start gap-2.5">
                          <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="size-3.5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {c.logradouro}{c.numero ? `, ${c.numero}` : ""}{c.complemento ? ` — ${c.complemento}` : ""}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {[c.bairro, c.cidade, c.estado].filter(Boolean).join(" · ")}
                              {c.cep ? ` · CEP ${c.cep}` : ""}
                            </p>
                          </div>
                        </div>
                      ) : c.cidade ? (
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <MapPin className="size-3.5 text-slate-500" />
                          </div>
                          <p className="text-sm font-medium text-slate-900">
                            {[c.cidade, c.estado].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      ) : null}

                      {c.rota_entrega && (
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Truck className="size-3.5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Rota</p>
                            <p className="text-sm font-medium text-slate-900">{c.rota_entrega}</p>
                          </div>
                        </div>
                      )}

                      {c.janela_entrega && (
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Clock className="size-3.5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Janela de entrega</p>
                            <p className="text-sm font-medium text-slate-900">{c.janela_entrega}</p>
                          </div>
                        </div>
                      )}

                      {c.instrucoes_entrega && (
                        <div className="flex items-start gap-2.5">
                          <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="size-3.5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Instruções de entrega</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{c.instrucoes_entrega}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Regras Comerciais */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <CardHeader
                title="Regras Comerciais"
                action={isAdminOrOwner ? (
                  <StatusBadge status={c.status} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" />
                ) : undefined}
              />
              <div className="p-5 space-y-3">

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tabela de preço" value={c.tabela_preco ?? "—"} />
                  <Field label="Cond. pagamento" value={c.condicao_pagamento ?? "—"} />
                  {c.forma_pagamento && <Field label="Forma de pagamento" value={c.forma_pagamento} />}
                  {c.desconto_padrao > 0 && <Field label="Desconto padrão" value={`${c.desconto_padrao}%`} />}
                </div>

                {/* Crédito */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="size-3.5 text-slate-400" />
                    <p className="text-xs text-slate-400">Limite de crédito</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">{BRL(c.limite_credito)}</p>
                  {c.limite_credito > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Em aberto: {BRL(creditoEmUso)}</span>
                        <span className={`font-semibold tabular-nums ${limitePct >= 90 ? "text-red-500" : "text-slate-400"}`}>
                          {Math.round(limitePct)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${limitePct >= 90 ? "bg-red-500" : limitePct >= 70 ? "bg-amber-500" : "bg-blue-600"}`}
                          style={{ width: `${limitePct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                {c.observacoes && (
                  <div className="pt-3 border-t border-slate-100 flex items-start gap-2">
                    <FileText className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">{c.observacoes}</p>
                  </div>
                )}

                {/* Vendedor */}
                <div className="pt-3 border-t border-slate-100">
                  <VendedorSwitch
                    customerId={id}
                    current={(c as any).vendedor ?? null}
                    vendedores={vendedores ?? []}
                  />
                </div>

                {/* Histórico de responsáveis */}
                {vendedorHistory && vendedorHistory.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Histórico de responsáveis
                    </p>
                    <div className="space-y-3">
                      {(vendedorHistory as any[]).map((h) => (
                        <div key={h.id} className="flex gap-2.5">
                          <div className="mt-1.5 size-1.5 rounded-full bg-slate-300 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">
                              {h.new_profile?.full_name ?? h.new_profile?.email ?? "Sem responsável"}
                            </p>
                            {h.old_profile && (
                              <p className="text-[10px] text-slate-400">
                                Substituiu {h.old_profile.full_name ?? h.old_profile.email}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400">
                              {DATE_SHORT(h.changed_at.split("T")[0])} · por {h.by_profile?.full_name ?? h.by_profile?.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
