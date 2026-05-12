import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { StatusBadge } from "@/components/ui/status-badge"
import { LinkButton } from "@/components/ui/link-button"
import { ChevronRight, Package, Plus } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/types/database"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full whitespace-nowrap">
      {children}
    </span>
  )
}

const CONSERVACAO_COLOR: Record<string, string> = {
  resfriado: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
  congelado:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20",
  fresco:     "bg-green-50 text-green-600 dark:bg-green-900/20",
  salgado:    "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
}

export default async function ProdutosPage() {
  const session = await auth()

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, nome, sku, categoria, unidade_medida, preco_base, status, metadata")
    .eq("tenant_id", session!.user.tenantId)
    .order("nome")

  const all     = products ?? []
  const ativos  = all.filter((p) => p.status === "ativo").length
  const inativos = all.filter((p) => p.status !== "ativo").length

  const kpis = [
    { label: "Total",    value: all.length, color: "text-foreground" },
    { label: "Ativos",   value: ativos,     color: "text-green-600" },
    { label: "Inativos", value: inativos,   color: "text-muted-foreground" },
  ]

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{all.length} {all.length === 1 ? "produto" : "produtos"} cadastrado{all.length !== 1 ? "s" : ""}</p>
        </div>
        <LinkButton href="/produtos/novo" className="gap-2 h-9 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-0">
          <Plus className="size-4" /> Novo produto
        </LinkButton>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{k.label}</p>
              <p className={`text-3xl font-black tracking-tight ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Lista */}
        {all.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <Package className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum produto cadastrado</p>
            <p className="text-xs text-slate-500 mb-4">Adicione os produtos do seu catálogo.</p>
            <LinkButton href="/produtos/novo" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-semibold">
              <Plus className="size-3.5" /> Adicionar produto
            </LinkButton>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">
            {(all as Product[]).map((p, i) => {
              const tipo    = p.metadata?.tipo_conservacao
              const colors  = tipo ? CONSERVACAO_COLOR[tipo] : "bg-muted text-muted-foreground"
              const initial = p.nome[0]?.toUpperCase() ?? "P"
              return (
                <div
                  key={p.id}
                  className={`group relative flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${i < all.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <Link href={`/produtos/${p.id}`} className="absolute inset-0 z-0" />

                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 pointer-events-none ${colors}`}>
                    <span className="text-xs font-bold">{initial}</span>
                  </div>

                  <div className="flex-1 min-w-0 pointer-events-none">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.nome}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{p.categoria ?? "Sem categoria"}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0 pointer-events-none">
                    {p.sku && <Chip>{p.sku}</Chip>}
                    <Chip>{p.unidade_medida}</Chip>
                    {tipo && <StatusBadge status={tipo} className="text-[10px] px-2 py-0.5 rounded-md relative z-10 pointer-events-auto" />}
                  </div>

                  <p className="text-sm font-bold text-slate-900 shrink-0 w-24 text-right tabular-nums pointer-events-none">
                    {BRL(Number(p.preco_base))}
                  </p>

                  <StatusBadge status={p.status} className="text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 relative z-10 pointer-events-auto" />

                  <Link
                    href={`/produtos/${p.id}/editar`}
                    className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors shrink-0 hidden group-hover:block ml-1 relative z-10"
                  >
                    Editar
                  </Link>

                  <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 pointer-events-none" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
