import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import { ChevronRight, Package, Plus, PackageCheck, PackageX } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/types/database"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const CONSERVACAO: Record<string, { label: string; cls: string }> = {
  resfriado: { label: "Resfriado", cls: "bg-blue-50 text-blue-600 border-blue-100" },
  congelado:  { label: "Congelado", cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  fresco:     { label: "Fresco",    cls: "bg-green-50 text-green-600 border-green-100" },
  salgado:    { label: "Salgado",   cls: "bg-amber-50 text-amber-600 border-amber-100" },
}

const GRID = "44px 1fr 100px 80px 120px 110px 100px 20px"

export default async function ProdutosPage() {
  const session = await auth()

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, nome, sku, categoria, unidade_medida, preco_base, status, metadata")
    .eq("tenant_id", session!.user.tenantId)
    .order("nome")

  const all      = products ?? []
  const ativos   = all.filter((p) => p.status === "ativo").length
  const inativos = all.filter((p) => p.status !== "ativo").length

  const kpis = [
    { label: "Total",    value: all.length, icon: Package,     iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
    { label: "Ativos",   value: ativos,     icon: PackageCheck, iconBg: "bg-green-50",  iconColor: "text-green-600" },
    { label: "Inativos", value: inativos,   icon: PackageX,    iconBg: "bg-slate-100", iconColor: "text-slate-400" },
  ]

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {all.length} {all.length === 1 ? "produto" : "produtos"} cadastrado{all.length !== 1 ? "s" : ""}
          </p>
        </div>
        <LinkButton
          href="/produtos/novo"
          className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg"
        >
          <Plus className="size-3.5" /> Novo produto
        </LinkButton>
      </div>

      <div className="px-6 py-6 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex items-center gap-4">
              <div className={`size-9 rounded-lg ${k.iconBg} flex items-center justify-center shrink-0`}>
                <k.icon className={`size-4 ${k.iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">{k.label}</p>
                <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {all.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <Package className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum produto cadastrado</p>
            <p className="text-xs text-slate-400 mb-4">Adicione os produtos do seu catálogo.</p>
            <LinkButton
              href="/produtos/novo"
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold rounded-lg"
            >
              <Plus className="size-3.5" /> Adicionar produto
            </LinkButton>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">

            {/* Column headers */}
            <div
              className="hidden md:grid items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: GRID }}
            >
              <span />
              <span>Produto</span>
              <span>SKU</span>
              <span>Unid.</span>
              <span>Conservação</span>
              <span>Status</span>
              <span className="text-right">Preço base</span>
              <span />
            </div>

            {(all as Product[]).map((p, i) => {
              const tipo      = p.metadata?.tipo_conservacao
              const conserv   = tipo ? CONSERVACAO[tipo] : null
              const initial   = p.nome[0]?.toUpperCase() ?? "P"
              const isLast    = i === all.length - 1

              return (
                <Link
                  key={p.id}
                  href={`/produtos/${p.id}`}
                  className={`group flex md:grid items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors ${!isLast ? "border-b border-slate-100" : ""}`}
                  style={{ gridTemplateColumns: GRID } as React.CSSProperties}
                >
                  {/* Avatar */}
                  <div className="hidden md:flex justify-center">
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${conserv ? conserv.cls + " border" : "bg-slate-100 border border-slate-200"}`}>
                      <span className="text-xs font-bold">{initial}</span>
                    </div>
                  </div>

                  {/* Nome + categoria */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate leading-none">{p.nome}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {p.categoria ?? "Sem categoria"}
                    </p>
                  </div>

                  {/* SKU */}
                  <p className="hidden md:block text-xs font-mono text-slate-500 truncate">
                    {p.sku ?? <span className="text-slate-300">—</span>}
                  </p>

                  {/* Unidade */}
                  <span className="hidden md:inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                    {p.unidade_medida}
                  </span>

                  {/* Conservação */}
                  <div className="hidden md:block">
                    {conserv ? (
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border ${conserv.cls}`}>
                        {conserv.label}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="hidden md:block">
                    <StatusBadge status={p.status} className="text-[10px] font-semibold px-2.5 py-1 rounded-md" />
                  </div>

                  {/* Preço */}
                  <p className="hidden md:block text-sm font-bold text-slate-900 tabular-nums text-right">
                    {BRL(Number(p.preco_base))}
                  </p>

                  {/* Mobile: preço + status */}
                  <div className="flex md:hidden items-center gap-2 ml-auto shrink-0">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{BRL(Number(p.preco_base))}</p>
                    <StatusBadge status={p.status} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" />
                  </div>

                  <ChevronRight className="hidden md:block size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
