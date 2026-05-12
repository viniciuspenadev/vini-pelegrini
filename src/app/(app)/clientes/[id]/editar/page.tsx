import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { getTenantVendedores } from "@/lib/queries"
import { LinkButton } from "@/components/ui/link-button"
import { CustomerForm } from "@/components/customer-form"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"
import type { Customer } from "@/types/database"

interface Props { params: Promise<{ id: string }> }

export default async function EditarClientePage({ params }: Props) {
  const { id }         = await params
  const session        = await auth()
  const isAdminOrOwner = ["owner", "admin"].includes(session!.user.role)

  const [{ data: customer }, vendedores] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", session!.user.tenantId)
      .single(),
    isAdminOrOwner ? getTenantVendedores(session!.user.tenantId) : Promise.resolve([]),
  ])

  if (!customer) notFound()

  const nome = (customer as any).nome_fantasia || customer.razao_social

  return (
    <div className="min-h-full bg-slate-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <LinkButton
          href={`/clientes/${id}`}
          className="h-8 w-8 p-0 rounded-full bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center"
        >
          <ChevronLeft className="size-4" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400 min-w-0">
          <span className="shrink-0">Clientes</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="truncate text-slate-600">{nome}</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-slate-900 shrink-0">Editar</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <CustomerForm
          customer={customer as Customer}
          vendedores={isAdminOrOwner ? vendedores : undefined}
          canEditStatus={isAdminOrOwner}
        />
      </div>
    </div>
  )
}
