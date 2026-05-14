import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { RecebimentoForm } from "@/components/financial/recebimento-form"

export default async function NovoRecebimentoPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const [{ data: customers }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id, razao_social, nome_fantasia")
      .eq("tenant_id", session.user.tenantId)
      .eq("status", "ativo")
      .order("razao_social"),
    supabaseAdmin
      .from("financial_categories")
      .select("id, name, parent_id, type")
      .eq("tenant_id", session.user.tenantId)
      .eq("type", "receita")
      .eq("active", true)
      .order("name"),
  ])

  return (
    <div className="min-h-full bg-blue-50">

      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/financeiro/recebimentos"
          className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>Financeiro</span>
          <ChevronRight className="size-3.5" />
          <span>Contas a Receber</span>
          <ChevronRight className="size-3.5" />
          <span className="text-slate-900">Novo</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <RecebimentoForm
          customers={customers ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  )
}
