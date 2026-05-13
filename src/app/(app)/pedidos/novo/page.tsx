import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { LinkButton } from "@/components/ui/link-button"
import { OrderForm } from "@/components/order-form"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default async function NovoPedidoPage() {
  const session = await auth()

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id, razao_social, nome_fantasia, rota_entrega, condicao_pagamento, status, limite_credito, forma_pagamento, desconto_padrao")
      .eq("tenant_id", session!.user.tenantId)
      .eq("status", "ativo")
      .order("razao_social"),
    supabaseAdmin
      .from("products")
      .select("id, nome, sku, unidade_medida, preco_base, metadata")
      .eq("tenant_id", session!.user.tenantId)
      .eq("status", "ativo")
      .order("nome"),
  ])

  const productsFormatted = (products ?? []).map((p) => ({
    id:                  p.id,
    nome:                p.nome,
    sku:                 p.sku,
    unidade_medida:      p.unidade_medida,
    preco_base:          Number(p.preco_base),
    venda_peso_variavel: p.metadata?.venda_peso_variavel ?? false,
    peso_medio:          p.metadata?.peso_medio_estimado ? Number(p.metadata.peso_medio_estimado) : null,
    conservacao:         p.metadata?.tipo_conservacao ?? null,
  }))

  return (
    <div className="min-h-full bg-blue-50">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton href="/pedidos" variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 shrink-0">
          <ChevronLeft className="size-4 text-slate-600" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Pedidos</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="font-semibold text-slate-900">Novo pedido</span>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        <OrderForm customers={customers ?? []} products={productsFormatted} />
      </div>
    </div>
  )
}
