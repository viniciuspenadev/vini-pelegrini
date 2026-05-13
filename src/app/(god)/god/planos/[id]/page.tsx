import { supabaseAdmin } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { GodPlanForm } from "@/components/god/god-plan-form"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface Props { params: Promise<{ id: string }> }

export default async function EditPlanPage({ params }: Props) {
  const { id }     = await params
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("id", id)
    .single()

  if (!plan) notFound()

  const p = {
    id:            plan.id,
    name:          plan.name,
    description:   plan.description,
    price_monthly: plan.price_monthly,
    modules:       Array.isArray(plan.modules) ? plan.modules : [],
    limits:        plan.limits ?? { users: 5, orders_per_month: 500 },
    is_active:     plan.is_active,
  }

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/god/planos" className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ChevronLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400 min-w-0">
          <span className="shrink-0">Planos</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-slate-900 truncate">{p.name}</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <GodPlanForm plan={p} />
      </div>
    </div>
  )
}
