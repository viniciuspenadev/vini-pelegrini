import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { BankAccountForm } from "@/components/bank-account-form"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default async function NovaContaBancariaPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")
  if (!["owner", "admin", "financeiro"].includes(session.user.role)) redirect("/")

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
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>Financeiro</span>
          <ChevronRight className="size-3.5" />
          <span>Contas</span>
          <ChevronRight className="size-3.5" />
          <span className="text-slate-900">Nova conta</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <BankAccountForm />
      </div>
    </div>
  )
}
