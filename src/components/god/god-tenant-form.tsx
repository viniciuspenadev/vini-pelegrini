"use client"

import { useTransition, useState } from "react"
import { createTenant } from "@/lib/actions/god"
import { Building2, User, Lock, Layers, Briefcase } from "lucide-react"

interface Plan    { id: string; name: string; modules: string[]; limits: Record<string, number> }
interface Segment { slug: string; label: string }
interface Props   { plans: Plan[]; segments: Segment[] }

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-card focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="size-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 text-violet-600 [&_svg]:size-3.5">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function GodTenantForm({ plans, segments }: Props) {
  const [pending, startTransition] = useTransition()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(plans[0] ?? null)
  const [segment, setSegment] = useState<string>(segments[0]?.slug ?? "pescados")
  const [name, setName] = useState("")

  const slug = name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("slug", slug)
    fd.set("modules", JSON.stringify(selectedPlan?.modules ?? []))
    fd.set("plan_id", selectedPlan?.id ?? "")
    fd.set("plan", selectedPlan?.name ?? "trial")
    fd.set("segment", segment)
    startTransition(() => createTenant(fd))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <Section title="Dados da Empresa" icon={<Building2 />}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Nome da empresa *</label>
          <input
            name="name" required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputBase}
            placeholder="Pescados Silva Ltda."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Slug (URL)</label>
          <input
            name="slug_display"
            value={slug}
            readOnly
            className={`${inputBase} bg-slate-50 text-slate-500 font-mono cursor-not-allowed`}
          />
          <p className="text-[11px] text-slate-400">Gerado automaticamente. Identifica o tenant na plataforma.</p>
        </div>
      </Section>

      <Section title="Segmento" icon={<Briefcase />}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Vertical de negócio *</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className={inputBase}
          >
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>{s.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Define como o inbox, o cadastro de cliente e o financeiro se comportam para este tenant.
            Pode ser trocado depois, mas reorganiza UI e templates.
          </p>
        </div>
      </Section>

      <Section title="Plano & Módulos" icon={<Layers />}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Plano inicial</label>
          <select
            name="plan_select"
            className={inputBase}
            value={selectedPlan?.id ?? ""}
            onChange={(e) => {
              const p = plans.find((pl) => pl.id === e.target.value) ?? null
              setSelectedPlan(p)
            }}
          >
            <option value="">— Trial sem plano —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {selectedPlan && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Módulos incluídos ({selectedPlan.modules.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedPlan.modules.map((m) => (
                <span key={m} className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                  {m}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Limite: {selectedPlan.limits?.users ?? 5} usuários · {selectedPlan.limits?.orders_per_month ?? 500} pedidos/mês
            </p>
          </div>
        )}
      </Section>

      <Section title="Owner da Empresa" icon={<User />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Nome completo *</label>
            <input name="owner_name" required className={inputBase} placeholder="João Silva" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">E-mail *</label>
            <input name="owner_email" type="email" required className={inputBase} placeholder="joao@empresa.com" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Senha inicial *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              name="owner_password"
              type="password"
              required
              minLength={8}
              className={`${inputBase} pl-9`}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            O owner deverá alterar a senha no primeiro acesso.
          </p>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <a href="/god/tenants" className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center">
          Cancelar
        </a>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="h-9 px-5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Criando..." : "Criar tenant"}
        </button>
      </div>
    </form>
  )
}
