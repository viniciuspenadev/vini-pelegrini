import { supabaseAdmin } from "@/lib/supabase"
import { GodTenantForm } from "@/components/god/god-tenant-form"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export default async function NovoTenantPage() {
  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("id, name, modules, limits")
    .eq("is_active", true)
    .order("price_monthly")

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/god/tenants"
          className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>Tenants</span>
          <ChevronRight className="size-3.5" />
          <span className="text-slate-900">Novo tenant</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <GodTenantForm plans={plans ?? []} />
      </div>
    </div>
  )
}
