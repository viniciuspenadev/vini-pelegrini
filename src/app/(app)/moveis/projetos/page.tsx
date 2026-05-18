import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ensureProjectStatusesBootstrap } from "@/lib/actions/projects"
import { LinkButton } from "@/components/ui/link-button"
import {
  FolderKanban, Plus, ChevronRight, Hammer, Calendar, TrendingUp, CircleDashed,
} from "lucide-react"

const BRL = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—"

interface PageProps {
  searchParams: Promise<{ status?: string; vendedor?: string }>
}

export default async function ProjetosPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const tenantId = session.user.tenantId
  const isAdminOrOwner = ["owner", "admin", "financeiro"].includes(session.user.role)

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("segment")
    .eq("id", tenantId)
    .single()

  await ensureProjectStatusesBootstrap(tenantId, tenant?.segment ?? null)

  const params = await searchParams

  // Statuses (pra filtro + render do badge)
  const { data: statusesRaw } = await supabaseAdmin
    .from("project_statuses")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("position")

  const statuses = statusesRaw ?? []
  const statusById = Object.fromEntries(statuses.map((s) => [s.id, s]))

  // Query principal
  let query = supabaseAdmin
    .from("projects")
    .select(`
      id, code, name, status_id, estimated_value, contracted_value, paid_value,
      expected_install_date, created_at,
      install_cidade, install_estado, install_bairro,
      customers ( id, razao_social, nome_fantasia, kind ),
      profiles!projects_assigned_to_fkey ( full_name )
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (params.status)   query = query.eq("status_id", params.status)
  if (params.vendedor && isAdminOrOwner) query = query.eq("assigned_to", params.vendedor)
  if (!isAdminOrOwner) query = query.eq("assigned_to", session.user.id)

  // Counts por status (sem filtro de status)
  let countsQuery = supabaseAdmin
    .from("projects")
    .select("status_id")
    .eq("tenant_id", tenantId)

  if (params.vendedor && isAdminOrOwner) countsQuery = countsQuery.eq("assigned_to", params.vendedor)
  if (!isAdminOrOwner) countsQuery = countsQuery.eq("assigned_to", session.user.id)

  const [{ data: projects }, { data: allStatusRows }] = await Promise.all([
    query.limit(200),
    countsQuery,
  ])

  // Contadores
  const countByStatus: Record<string, number> = {}
  for (const r of allStatusRows ?? []) {
    countByStatus[r.status_id] = (countByStatus[r.status_id] ?? 0) + 1
  }
  const totalCount = (allStatusRows ?? []).length

  // KPIs (sobre o resultado FILTRADO)
  const list = (projects ?? []) as any[]

  const completedStatusIds = new Set(statuses.filter((s) => s.is_completed).map((s) => s.id))
  const cancelledStatusIds = new Set(statuses.filter((s) => s.is_cancelled).map((s) => s.id))

  const inProduction = list.filter((p) =>
    !completedStatusIds.has(p.status_id) && !cancelledStatusIds.has(p.status_id)
  ).length

  const today = new Date()
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const nextInstalls = list.filter((p) => {
    if (!p.expected_install_date) return false
    const d = new Date(p.expected_install_date + "T00:00:00")
    return d >= today && d <= in30 && !completedStatusIds.has(p.status_id)
  }).length

  const pipelineValue = list
    .filter((p) => !cancelledStatusIds.has(p.status_id))
    .reduce((sum, p) => sum + (Number(p.contracted_value ?? p.estimated_value ?? 0)), 0)

  return (
    <div className="min-h-full bg-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <FolderKanban className="size-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span>Vendas</span>
              <ChevronRight className="size-3" />
              <span className="text-slate-600 font-medium">Projetos</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Projetos</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalCount} {totalCount === 1 ? "projeto" : "projetos"} no total
            </p>
          </div>
        </div>
        <LinkButton
          href="/moveis/projetos/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="size-4 mr-1.5" /> Novo projeto
        </LinkButton>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Kpi icon={<FolderKanban className="size-4" />} label="Total"            value={String(list.length)}      color="#3B82F6" />
          <Kpi icon={<Hammer       className="size-4" />} label="Em execução"      value={String(inProduction)}     color="#84CC16" />
          <Kpi icon={<Calendar     className="size-4" />} label="Inst. próx. 30d"  value={String(nextInstalls)}     color="#F59E0B" />
          <Kpi icon={<TrendingUp   className="size-4" />} label="Valor pipeline"   value={BRL(pipelineValue)}       color="#10B981" />
        </div>

        {/* Filtro de status — tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-2">
          <div className="flex items-center gap-1 flex-wrap">
            <StatusTab
              href="/moveis/projetos"
              active={!params.status}
              label="Todos"
              count={totalCount}
              color="#64748B"
            />
            {statuses.map((s) => (
              <StatusTab
                key={s.id}
                href={`/moveis/projetos?status=${s.id}`}
                active={params.status === s.id}
                label={s.name}
                count={countByStatus[s.id] ?? 0}
                color={s.color}
              />
            ))}
          </div>
        </div>

        {/* Lista */}
        {list.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card px-8 py-16 text-center">
            <CircleDashed className="size-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">Nenhum projeto ainda</p>
            <p className="text-xs text-slate-400 mb-5">
              Crie o primeiro projeto para começar a acompanhar a execução.
            </p>
            <LinkButton
              href="/moveis/projetos/novo"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Plus className="size-4 mr-1.5" /> Criar projeto
            </LinkButton>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-4 py-2.5 text-left">Código</th>
                  <th className="px-4 py-2.5 text-left">Projeto / Cliente</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Vendedor</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                  <th className="px-4 py-2.5 text-left">Instalação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => {
                  const status = statusById[p.status_id]
                  const customerName = p.customers?.nome_fantasia || p.customers?.razao_social || "—"
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/moveis/projetos/${p.id}`} className="text-xs font-mono font-semibold text-blue-600 hover:underline">
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 min-w-0">
                        <Link href={`/moveis/projetos/${p.id}`} className="block">
                          <p className="text-sm font-semibold text-slate-900 truncate hover:text-blue-600">{p.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {customerName}
                            {p.install_cidade && (
                              <span className="text-slate-400"> · {p.install_cidade}{p.install_estado ? `/${p.install_estado}` : ""}</span>
                            )}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {status && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: status.color + "20", color: status.color }}
                          >
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                            {status.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {p.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs text-slate-900 font-semibold">
                        {BRL(Number(p.contracted_value ?? p.estimated_value ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                        {formatDate(p.expected_install_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
      <div
        className="size-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "15", color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-slate-900 tabular-nums truncate">{value}</p>
      </div>
    </div>
  )
}

function StatusTab({ href, active, label, count, color }: { href: string; active: boolean; label: string; count: number; color: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
        active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
      <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{count}</span>
    </Link>
  )
}
