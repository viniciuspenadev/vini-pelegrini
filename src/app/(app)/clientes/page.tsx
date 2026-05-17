import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import { ClientesList } from "@/components/clientes-list"
import { Plus, Users, UserCheck, ShieldAlert } from "lucide-react"

export default async function ClientesPage() {
  const session        = await auth()
  const isVendedor     = session!.user.role === "vendedor"
  const isAdminOrOwner = ["owner", "admin"].includes(session!.user.role)

  let query = supabaseAdmin
    .from("customers")
    .select(`
      id, razao_social, nome_fantasia, cnpj_cpf, kind, metadata,
      cidade, estado, rota_entrega, forma_pagamento, status,
      profiles!customers_vendedor_id_fkey ( full_name, email )
    `)
    .eq("tenant_id", session!.user.tenantId)
    .order("razao_social")

  if (isVendedor) query = query.eq("vendedor_id", session!.user.id)

  const { data: raw } = await query
  const all = (raw ?? []) as any[]

  const pjCount   = all.filter((c) => c.kind === "B2B").length
  const pfCount   = all.filter((c) => c.kind === "B2C").length
  const bloqueados = all.filter((c) => c.status === "bloqueado").length

  const kpis = [
    {
      label:     "Total",
      value:     all.length,
      icon:      Users,
      iconBg:    "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label:     "Pessoa Jurídica",
      value:     pjCount,
      icon:      UserCheck,
      iconBg:    "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label:     "Pessoa Física",
      value:     pfCount,
      icon:      UserCheck,
      iconBg:    "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label:     "Bloqueados",
      value:     bloqueados,
      icon:      ShieldAlert,
      iconBg:    "bg-red-50",
      iconColor: "text-red-500",
    },
  ]

  const customers = all.map((c) => ({
    id:              c.id,
    razao_social:    c.razao_social,
    nome_fantasia:   c.nome_fantasia,
    cnpj_cpf:        c.cnpj_cpf,
    kind:            (c.kind ?? "B2B") as "B2B" | "B2C",
    origem:          c.metadata?.origem ?? null,
    cidade:          c.cidade,
    estado:          c.estado,
    rota_entrega:    c.rota_entrega,
    forma_pagamento: c.forma_pagamento,
    status:          c.status,
    vendedor:        c.profiles ?? null,
  }))

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {all.length} {all.length === 1 ? "cliente" : "clientes"} cadastrado{all.length !== 1 ? "s" : ""}
          </p>
        </div>
        <LinkButton
          href="/clientes/novo"
          className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg"
        >
          <Plus className="size-3.5" /> Novo cliente
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex items-center gap-4">
              <div className={`size-9 rounded-lg ${k.iconBg} flex items-center justify-center shrink-0`}>
                <k.icon className={`size-4.5 ${k.iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lista com busca + filtros */}
        <ClientesList customers={customers} isAdminOrOwner={isAdminOrOwner} />

      </div>
    </div>
  )
}
