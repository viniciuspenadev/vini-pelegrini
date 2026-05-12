import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ProductForm } from "@/components/product-form"
import type { Product } from "@/types/database"

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const { data } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session!.user.tenantId)
    .single()

  if (!data) notFound()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/produtos" className="hover:text-slate-700">Produtos</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.nome}</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar produto</h1>
      <ProductForm product={data as Product} />
    </div>
  )
}
