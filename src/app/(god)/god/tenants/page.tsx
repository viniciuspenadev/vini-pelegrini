import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"
import { Plus, ChevronRight, Building2 } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  trial:     "bg-amber-100 text-amber-700",
  active:    "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
}
const STATUS_LABELS: Record<string, string> = {
  trial:     "Trial",
  active:    "Ativo",
  suspended: "Suspenso",
}

const DATE = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

export default async function GodTenantsPage() {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, status, plan, modules, created_at, trial_ends_at")
    .order("created_at", { ascending: false })

  const all = tenants ?? []

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tenants</h1>
          <p className="text-xs text-slate-400 mt-0.5">{all.length} empresas registradas</p>
        </div>
        <Link
          href="/god/tenants/novo"
          className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          <Plus className="size-3.5" /> Novo tenant
        </Link>
      </div>

      <div className="px-6 py-6">
        {all.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <Building2 className="size-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Nenhum tenant ainda</p>
            <p className="text-xs text-slate-400 mb-4">Crie o primeiro tenant para começar.</p>
            <Link
              href="/god/tenants/novo"
              className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              <Plus className="size-3.5" /> Criar tenant
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div
              className="hidden md:grid items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: "44px 1fr 140px 100px 140px 20px" }}
            >
              <span />
              <span>Empresa</span>
              <span>Plano</span>
              <span className="text-center">Status</span>
              <span>Criado em</span>
              <span />
            </div>

            {all.map((t, i) => {
              const isLast = i === all.length - 1
              const modulesArr = Array.isArray(t.modules) ? t.modules : []
              return (
                <Link
                  key={t.id}
                  href={`/god/tenants/${t.id}`}
                  className={`group flex md:grid items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${!isLast ? "border-b border-slate-100" : ""}`}
                  style={{ gridTemplateColumns: "44px 1fr 140px 100px 140px 20px" } as React.CSSProperties}
                >
                  <div className="hidden md:flex justify-center">
                    <div className="size-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-violet-600">{t.name[0]?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{t.slug}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-medium text-slate-700">{t.plan}</p>
                    <p className="text-[11px] text-slate-400">{modulesArr.length} módulos</p>
                  </div>
                  <div className="hidden md:flex justify-center">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md ${STATUS_COLORS[t.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                  <p className="hidden md:block text-xs text-slate-500">{DATE(t.created_at)}</p>
                  <ChevronRight className="size-3.5 text-slate-300 group-hover:text-violet-500 transition-colors hidden md:block" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
