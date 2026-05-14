import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { TenantFinancialForm } from "@/components/tenant-financial-form"
import { Wallet, ChevronRight } from "lucide-react"
import type { TenantFinancialConfig, BankAccount } from "@/types/database"

export default async function ConfigFinanceiroPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const [{ data: config }, { data: bankAccounts }] = await Promise.all([
    supabaseAdmin
      .from("tenant_financial_config")
      .select("*")
      .eq("tenant_id", session.user.tenantId)
      .maybeSingle(),
    supabaseAdmin
      .from("bank_accounts")
      .select("id, name")
      .eq("tenant_id", session.user.tenantId)
      .eq("active", true)
      .order("name"),
  ])

  return (
    <div className="min-h-full bg-blue-50">

      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
          <span>Configurações</span>
          <ChevronRight className="size-3" />
          <span className="text-slate-600 font-medium">Financeiro</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Wallet className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configuração Financeira</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Geração automática de recebimentos, defaults e preferências do DRE
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <TenantFinancialForm
          config={(config ?? null) as TenantFinancialConfig | null}
          bankAccounts={(bankAccounts ?? []) as Pick<BankAccount, "id" | "name">[]}
        />
      </div>
    </div>
  )
}
