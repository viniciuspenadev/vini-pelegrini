import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import { PedidosFilters } from "@/components/pedidos-filters"
import { PedidosList } from "@/components/pedidos-list"
import { Plus } from "lucide-react"

const BRL = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

interface PageProps {
  searchParams: Promise<{ status?: string; data?: string; vendedor?: string }>
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const session = await auth()
  const params  = await searchParams

  const isAdminOrOwner = ["owner", "admin", "financeiro"].includes(session!.user.role)

  // ── Query principal (com filtros aplicados) ──
  let query = supabaseAdmin
    .from("orders")
    .select(`
      id, status, order_number, delivery_date, priority, customer_po,
      estimated_total_amount, final_total_amount, created_at,
      customers ( razao_social, nome_fantasia, rota_entrega ),
      profiles!orders_owner_id_fkey ( full_name, email )
    `)
    .eq("tenant_id", session!.user.tenantId)
    .order("created_at", { ascending: false })

  if (params.status)   query = query.eq("status", params.status)
  if (params.data)     query = query.eq("delivery_date", params.data)
  if (params.vendedor && isAdminOrOwner) query = query.eq("owner_id", params.vendedor)
  if (!isAdminOrOwner) query = query.eq("owner_id", session!.user.id)

  // ── Query de contagens por status (sem filtro de status) ──
  let countsQuery = supabaseAdmin
    .from("orders")
    .select("status")
    .eq("tenant_id", session!.user.tenantId)

  if (params.data)     countsQuery = countsQuery.eq("delivery_date", params.data)
  if (params.vendedor && isAdminOrOwner) countsQuery = countsQuery.eq("owner_id", params.vendedor)
  if (!isAdminOrOwner) countsQuery = countsQuery.eq("owner_id", session!.user.id)

  // ── Vendedores para o filtro ──
  const sellersQuery = isAdminOrOwner
    ? supabaseAdmin.from("tenant_users")
        .select("user_id, profiles ( id, full_name, email )")
        .eq("tenant_id", session!.user.tenantId)
    : Promise.resolve({ data: null })

  const [
    { data: orders },
    { data: allStatuses },
    { data: tenantUsers },
  ] = await Promise.all([
    query.limit(200),
    countsQuery,
    sellersQuery,
  ])

  const all = orders ?? []

  const statusCounts = (allStatuses ?? []).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const sellers = ((tenantUsers as any[]) ?? []).map((tu: any) => ({
    id:   tu.user_id,
    name: tu.profiles?.full_name ?? tu.profiles?.email ?? tu.user_id,
  }))

  const activeFilters  = [params.status, params.data, params.vendedor].filter(Boolean).length
  const valorTotal     = all.reduce((s, o: any) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)
  const emAndamento    = all.filter((o: any) => !["cancelado", "entregue"].includes(o.status)).length
  const entregues      = all.filter((o: any) => o.status === "entregue").length

  const kpis = [
    { label: "Pedidos",      value: String(all.length) },
    { label: "Valor total",  value: BRL(valorTotal) },
    { label: "Em andamento", value: String(emAndamento) },
    { label: "Entregues",    value: String(entregues) },
  ]

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pedidos</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {all.length} {all.length === 1 ? "pedido" : "pedidos"}
            {activeFilters > 0 ? " encontrados" : ""}
          </p>
        </div>
        <LinkButton href="/pedidos/novo" className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg">
          <Plus className="size-3.5" /> Novo pedido
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-card">
              <p className="text-xs text-slate-400 mb-1.5">{k.label}</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <PedidosFilters
          status={params.status}
          data={params.data}
          vendedor={params.vendedor}
          sellers={sellers}
          showSellers={isAdminOrOwner}
          activeFilters={activeFilters}
          statusCounts={statusCounts}
        />

        {/* Lista com busca + overdue + rota + mobile */}
        <PedidosList
          orders={all}
          isAdminOrOwner={isAdminOrOwner}
          hasFilters={activeFilters > 0}
        />

      </div>
    </div>
  )
}
