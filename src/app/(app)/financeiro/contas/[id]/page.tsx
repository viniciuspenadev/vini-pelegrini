import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { BankAccountForm } from "@/components/bank-account-form"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { BankAccount } from "@/types/database"

export default async function EditarContaBancariaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

  const { data } = await supabaseAdmin
    .from("bank_accounts")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!data) notFound()
  const account = data as BankAccount

  return (
    <div className="min-h-full bg-blue-50">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/financeiro/contas"
          className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400 min-w-0">
          <span className="shrink-0">Financeiro</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="shrink-0">Contas</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-slate-900 truncate">{account.name}</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <BankAccountForm account={account} />
      </div>
    </div>
  )
}
