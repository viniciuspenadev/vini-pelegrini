import { auth } from "@/auth"
import { getTenantVendedores } from "@/lib/queries"
import { LinkButton } from "@/components/ui/link-button"
import { CustomerForm } from "@/components/customer-form"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default async function NovoClientePage() {
  const session    = await auth()
  const isAdminOrOwner = ["owner", "admin"].includes(session!.user.role)
  const vendedores = isAdminOrOwner
    ? await getTenantVendedores(session!.user.tenantId)
    : []

  return (
    <div className="min-h-full bg-slate-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <LinkButton
          href="/clientes"
          className="h-8 w-8 p-0 rounded-full bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center"
        >
          <ChevronLeft className="size-4" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>Clientes</span>
          <ChevronRight className="size-3.5" />
          <span className="text-slate-900">Novo cliente</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <CustomerForm
          vendedores={isAdminOrOwner ? vendedores : undefined}
          canEditStatus={false}
        />
      </div>
    </div>
  )
}
