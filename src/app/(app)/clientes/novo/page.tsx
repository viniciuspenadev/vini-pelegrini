import { auth } from "@/auth"
import { getTenantVendedores } from "@/lib/queries"
import { LinkButton } from "@/components/ui/link-button"
import { CustomerForm } from "@/components/customer-form"
import { CustomerKindPicker } from "@/components/customer-kind-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { kindMeta } from "@/lib/customer-kinds"
import type { CustomerKind } from "@/lib/customer-kinds"

interface Props {
  searchParams: Promise<{ kind?: string }>
}

export default async function NovoClientePage({ searchParams }: Props) {
  const session    = await auth()
  const isAdminOrOwner = ["owner", "admin"].includes(session!.user.role)
  const vendedores = isAdminOrOwner
    ? await getTenantVendedores(session!.user.tenantId)
    : []

  const { kind: kindParam } = await searchParams
  const validKind = kindParam === "B2B" || kindParam === "B2C" ? (kindParam as CustomerKind) : null
  const meta      = validKind ? kindMeta(validKind) : null

  return (
    <div className="min-h-full bg-blue-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <LinkButton
          href={validKind ? "/clientes/novo" : "/clientes"}
          className="h-8 w-8 p-0 rounded-full bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center"
        >
          <ChevronLeft className="size-4" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>Clientes</span>
          <ChevronRight className="size-3.5" />
          <span className={validKind ? "" : "text-slate-900"}>Novo cliente</span>
          {validKind && meta && (
            <>
              <ChevronRight className="size-3.5" />
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ backgroundColor: meta.color + "20", color: meta.color }}
              >
                {meta.label}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        {validKind ? (
          <CustomerForm
            kind={validKind}
            vendedores={isAdminOrOwner ? vendedores : undefined}
            canEditStatus={false}
          />
        ) : (
          <CustomerKindPicker
            baseHref="/clientes/novo"
          />
        )}
      </div>
    </div>
  )
}
