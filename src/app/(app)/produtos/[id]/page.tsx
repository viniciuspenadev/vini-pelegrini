import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ProductForm } from "@/components/product-form"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/types/database"

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const session = await auth()

  const [{ data }, { data: fiscalConfig }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", session!.user.tenantId)
      .single(),
    supabaseAdmin
      .from("tenant_fiscal_config")
      .select("regime_tributario")
      .eq("tenant_id", session!.user.tenantId)
      .maybeSingle(),
  ])

  if (!data) notFound()

  const product           = data as Product
  const canEditFiscal     = ["owner", "admin", "financeiro"].includes(session!.user.role)
  const regimeTributario  = fiscalConfig?.regime_tributario ?? null

  return (
    <div className="min-h-full bg-blue-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/produtos"
          className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400 min-w-0">
          <span className="shrink-0">Produtos</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-slate-900 truncate">{product.nome}</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <ProductForm
          product={product}
          canEditFiscal={canEditFiscal}
          regimeTributario={regimeTributario}
        />
      </div>
    </div>
  )
}
