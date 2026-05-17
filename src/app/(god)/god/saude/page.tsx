import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"
import {
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  MessageCircle, Clock, RefreshCw,
} from "lucide-react"
import { TenantHealthRow } from "@/components/god/tenant-health-row"

// Re-renderiza no servidor a cada acesso (sem cache)
export const dynamic = "force-dynamic"

export default async function GodHealthPage() {
  // 1. Tenants + instâncias WhatsApp (LEFT JOIN — nem todo tenant tem instância)
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, status, plan, segment, created_at")
    .order("created_at", { ascending: false })

  // 2. Instâncias WhatsApp em batch
  const tenantIds = (tenants ?? []).map((t) => t.id)
  const { data: instances } = tenantIds.length > 0
    ? await supabaseAdmin
        .from("whatsapp_instances")
        .select("tenant_id, status, phone_number, last_heartbeat_at, reconnect_attempts, user_disconnected, last_error, updated_at")
        .in("tenant_id", tenantIds)
    : { data: [] }

  const instanceByTenant = new Map<string, NonNullable<typeof instances>[number]>()
  for (const i of instances ?? []) instanceByTenant.set(i.tenant_id, i)

  // 3. Última mensagem por tenant (recebida ou enviada)
  const { data: lastMessages } = tenantIds.length > 0
    ? await supabaseAdmin
        .from("chat_messages")
        .select("tenant_id, created_at, sender_type")
        .in("tenant_id", tenantIds)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] }

  const lastMsgByTenant = new Map<string, { created_at: string; sender_type: string }>()
  for (const m of lastMessages ?? []) {
    if (!lastMsgByTenant.has(m.tenant_id)) {
      lastMsgByTenant.set(m.tenant_id, { created_at: m.created_at, sender_type: m.sender_type })
    }
  }

  // 4. Categoriza por saúde
  const now = Date.now()
  const HOUR = 3_600_000
  const DAY  = 86_400_000

  const rows = (tenants ?? []).map((t) => {
    const inst = instanceByTenant.get(t.id)
    const msg  = lastMsgByTenant.get(t.id)
    const lastHbMs   = inst?.last_heartbeat_at ? now - new Date(inst.last_heartbeat_at).getTime() : Infinity
    const lastMsgMs  = msg?.created_at         ? now - new Date(msg.created_at).getTime()         : Infinity

    let healthLevel: "healthy" | "degraded" | "down" | "no_whatsapp" = "no_whatsapp"
    if (inst) {
      if (inst.status === "connected" && lastHbMs < HOUR) healthLevel = "healthy"
      else if (inst.status === "disconnected" && (inst.user_disconnected || (inst.reconnect_attempts ?? 0) >= 3)) healthLevel = "down"
      else healthLevel = "degraded"
    }

    return {
      tenant: t,
      instance: inst,
      lastMessage: msg,
      lastHbMs,
      lastMsgMs,
      healthLevel,
    }
  })

  const healthy   = rows.filter((r) => r.healthLevel === "healthy").length
  const degraded  = rows.filter((r) => r.healthLevel === "degraded").length
  const down      = rows.filter((r) => r.healthLevel === "down").length
  const noWa      = rows.filter((r) => r.healthLevel === "no_whatsapp").length
  const inactive  = rows.filter((r) => r.lastMsgMs > 7 * DAY && r.healthLevel !== "no_whatsapp").length

  const cards = [
    { label: "Saudáveis",     value: healthy,  icon: CheckCircle2,  bg: "bg-green-50",  color: "text-green-600" },
    { label: "Degradados",    value: degraded, icon: AlertTriangle, bg: "bg-amber-50",  color: "text-amber-600" },
    { label: "WhatsApp caído",value: down,     icon: WifiOff,       bg: "bg-red-50",    color: "text-red-600"   },
    { label: "Sem atividade 7d", value: inactive, icon: Clock,      bg: "bg-slate-100", color: "text-slate-600" },
  ]

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="size-5 text-violet-600" />
            Saúde Operacional
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {rows.length} tenants monitorados — auto-refresh a cada 30s
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex items-center gap-4">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 grid items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"
            style={{ gridTemplateColumns: "1fr 120px 130px 150px 150px 90px" }}
          >
            <span>Tenant</span>
            <span>WhatsApp</span>
            <span>Telefone</span>
            <span>Último heartbeat</span>
            <span>Última msg</span>
            <span className="text-right">Ações</span>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <MessageCircle className="size-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum tenant cadastrado.</p>
              </div>
            ) : (
              rows.map((r) => <TenantHealthRow key={r.tenant.id} {...r} />)
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700 mb-2">Como interpretar os status</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-green-500"/> <strong>Saudável</strong> — connected + heartbeat &lt; 1h</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"/> <strong>Degradado</strong> — connecting/reconectando ou heartbeat parado</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500"/>   <strong>Caído</strong> — desconectado e não consegue reconectar (precisa QR)</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400"/> <strong>Sem WhatsApp</strong> — não configurou ainda</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RefreshButton() {
  return (
    <Link
      href="/god/saude"
      className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
    >
      <RefreshCw className="size-3.5" />
      Atualizar
    </Link>
  )
}
