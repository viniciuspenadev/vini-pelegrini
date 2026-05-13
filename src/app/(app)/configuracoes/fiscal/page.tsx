import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { TenantFiscalForm } from "@/components/tenant-fiscal-form"
import { Receipt, ChevronRight } from "lucide-react"
import type { TenantFiscalConfig } from "@/types/database"

export default async function ConfigFiscalPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) {
    redirect("/")
  }

  const { data } = await supabaseAdmin
    .from("tenant_fiscal_config")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .maybeSingle()

  const config = (data ?? null) as TenantFiscalConfig | null

  return (
    <div className="min-h-full bg-blue-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
          <span>Configurações</span>
          <ChevronRight className="size-3" />
          <span className="text-slate-600 font-medium">Fiscal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Receipt className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configuração Fiscal</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Dados do emitente, certificado digital e provider de NF-e
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <TenantFiscalForm config={config} />
      </div>
    </div>
  )
}
