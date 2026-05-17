"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import {
  Wifi, WifiOff, AlertTriangle, RefreshCw, ExternalLink,
  ArrowDownToLine, ArrowUpFromLine, MinusCircle, Loader2,
} from "lucide-react"
import { recheckTenantHealth } from "@/lib/actions/god-health"

type Health = "healthy" | "degraded" | "down" | "no_whatsapp"

interface TenantMini {
  id: string; name: string; slug: string; status: string; plan: string | null; segment: string | null
}

interface InstanceMini {
  status:              string
  phone_number:        string | null
  last_heartbeat_at:   string | null
  reconnect_attempts:  number | null
  user_disconnected:   boolean | null
  last_error:          string | null
  updated_at:          string | null
}

interface Props {
  tenant:       TenantMini
  instance:     InstanceMini | undefined
  lastMessage:  { created_at: string; sender_type: string } | undefined
  lastHbMs:     number
  lastMsgMs:    number
  healthLevel:  Health
}

const HEALTH_STYLE: Record<Health, { dot: string; label: string; color: string }> = {
  healthy:     { dot: "bg-green-500",  label: "Saudável",   color: "text-green-700" },
  degraded:    { dot: "bg-amber-500",  label: "Degradado",  color: "text-amber-700" },
  down:        { dot: "bg-red-500",    label: "Caído",      color: "text-red-700"   },
  no_whatsapp: { dot: "bg-slate-300",  label: "Sem WhatsApp", color: "text-slate-500" },
}

function fmtRelative(ms: number): string {
  if (!isFinite(ms)) return "—"
  const min = Math.floor(ms / 60_000)
  const hr  = Math.floor(ms / 3_600_000)
  const day = Math.floor(ms / 86_400_000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min}m`
  if (hr  < 24) return `há ${hr}h`
  return `há ${day}d`
}

export function TenantHealthRow({ tenant, instance, lastMessage, lastHbMs, lastMsgMs, healthLevel }: Props) {
  const style = HEALTH_STYLE[healthLevel]
  const [, forceTick] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [recheckMsg, setRecheckMsg]  = useState<string | null>(null)

  // Re-renderiza a cada 30s para atualizar os "há X min"
  useEffect(() => {
    const id = setInterval(() => forceTick((v) => v + 1), 30000)
    return () => clearInterval(id)
  }, [])

  function handleRecheck() {
    setRecheckMsg(null)
    startTransition(async () => {
      try {
        const r = await recheckTenantHealth(tenant.id)
        setRecheckMsg(r.status === "connected" ? "✓ conectado" : `→ ${r.status}`)
        setTimeout(() => setRecheckMsg(null), 3000)
      } catch (e) {
        setRecheckMsg(`erro: ${(e as Error).message}`)
      }
    })
  }

  const lastDirection = lastMessage?.sender_type === "contact"
    ? { icon: ArrowDownToLine, color: "text-blue-500", label: "recebida" }
    : lastMessage?.sender_type === "agent"
    ? { icon: ArrowUpFromLine, color: "text-green-500", label: "enviada" }
    : { icon: MinusCircle, color: "text-slate-300", label: "—" }

  const DirIcon = lastDirection.icon

  return (
    <div
      className="grid items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
      style={{ gridTemplateColumns: "1fr 120px 130px 150px 150px 90px" }}
    >
      {/* Tenant */}
      <div className="min-w-0 flex items-center gap-2.5">
        <span className={`size-2 rounded-full shrink-0 ${style.dot}`} title={style.label} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{tenant.name}</p>
          <p className="text-[10px] text-slate-400 font-mono truncate">
            {tenant.slug} • {tenant.segment ?? "—"}
          </p>
        </div>
      </div>

      {/* WhatsApp status */}
      <div>
        {instance ? (
          <div className="flex items-center gap-1.5">
            {instance.status === "connected" ? (
              <Wifi className="size-3.5 text-green-600" />
            ) : instance.status === "connecting" ? (
              <RefreshCw className="size-3.5 text-amber-500 animate-spin" />
            ) : (
              <WifiOff className="size-3.5 text-red-500" />
            )}
            <span className={`text-xs font-semibold capitalize ${style.color}`}>
              {instance.status}
            </span>
            {(instance.reconnect_attempts ?? 0) > 0 && (
              <span className="text-[10px] text-amber-600 font-bold">
                {instance.reconnect_attempts}×
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">não configurado</span>
        )}
        {instance?.last_error && (
          <p className="text-[9px] text-red-600 truncate mt-0.5" title={instance.last_error}>
            <AlertTriangle className="size-2.5 inline mr-0.5" />
            {instance.last_error.slice(0, 50)}
          </p>
        )}
      </div>

      {/* Telefone */}
      <p className="text-[11px] text-slate-600 font-mono truncate">
        {instance?.phone_number ?? "—"}
      </p>

      {/* Heartbeat */}
      <p className="text-xs text-slate-700">
        {instance ? fmtRelative(lastHbMs) : "—"}
        {instance?.last_heartbeat_at && (
          <span className="text-[10px] text-slate-400 block">
            {new Date(instance.last_heartbeat_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </p>

      {/* Última mensagem */}
      <p className="text-xs text-slate-700">
        {lastMessage ? (
          <>
            <DirIcon className={`size-3 inline mr-1 ${lastDirection.color}`} />
            {fmtRelative(lastMsgMs)}
            <span className="text-[10px] text-slate-400 block">{lastDirection.label}</span>
          </>
        ) : (
          <span className="text-slate-400 italic">sem mensagens</span>
        )}
      </p>

      {/* Ações */}
      <div className="flex items-center justify-end gap-1">
        {instance && (
          <button
            type="button"
            onClick={handleRecheck}
            disabled={isPending}
            title="Verificar agora"
            className="size-7 rounded-lg hover:bg-violet-50 text-slate-500 hover:text-violet-600 flex items-center justify-center disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </button>
        )}
        <Link
          href={`/god/tenants/${tenant.id}`}
          title="Abrir tenant"
          className="size-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center"
        >
          <ExternalLink className="size-3.5" />
        </Link>
        {recheckMsg && (
          <span className="text-[9px] font-semibold text-violet-600 absolute -translate-x-12 mt-6">{recheckMsg}</span>
        )}
      </div>
    </div>
  )
}
