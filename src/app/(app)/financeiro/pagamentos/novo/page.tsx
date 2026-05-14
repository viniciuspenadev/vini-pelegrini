import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PagamentoForm } from "@/components/financial/pagamento-form"

export default async function NovoPagamentoPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const { data: categories } = await supabaseAdmin
    .from("financial_categories")
    .select("id, name, parent_id, type")
    .eq("tenant_id", session.user.tenantId)
    .eq("type", "despesa")
    .eq("active", true)
    .order("name")

  return (
    <div className="min-h-full bg-blue-50">

      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/financeiro/pagamentos"
          className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>Financeiro</span>
          <ChevronRight className="size-3.5" />
          <span>Contas a Pagar</span>
          <ChevronRight className="size-3.5" />
          <span className="text-slate-900">Novo</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <PagamentoForm categories={categories ?? []} />
      </div>
    </div>
  )
}
