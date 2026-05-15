"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { QrCodeScanner } from "@/components/chat/qr-code-scanner"
import {
  saveWhatsAppConfig,
  disconnectWhatsApp,
  configureWebhook,
  createQuickReply,
  deleteQuickReply,
  checkConnectionStatus,
} from "@/lib/actions/chat"
import {
  Wifi, WifiOff, Globe, Key, Server,
  Save, Loader2, Trash2, Plus, Zap, Link2, MessageSquare,
  Heart, AlertCircle, RefreshCw, CheckCircle2,
} from "lucide-react"
import type { WhatsAppInstance, ChatQuickReply } from "@/types/chat"

interface Props {
  instance:     WhatsAppInstance | null
  quickReplies: ChatQuickReply[]
}

function formatRelative(iso: string | null): string {
  if (!iso) return "nunca"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "agora mesmo"
  if (mins < 60) return `há ${mins} min`
  if (hrs < 24)  return `há ${hrs}h`
  return `há ${days}d`
}

function HealthCard({ instance }: { instance: WhatsAppInstance }) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)
  const [, forceTick] = useState(0)

  // Re-renderiza a cada 30s para atualizar "há X min"
  useEffect(() => {
    const id = setInterval(() => forceTick((v) => v + 1), 30000)
    return () => clearInterval(id)
  }, [])

  async function handleCheck() {
    setIsChecking(true)
    try {
      await checkConnectionStatus()
      router.refresh()
    } finally {
      setIsChecking(false)
    }
  }

  const hb            = instance.last_heartbeat_at
  const hbAgeMin      = hb ? Math.floor((Date.now() - new Date(hb).getTime()) / 60000) : Infinity
  const hasError      = !!instance.last_error
  const isConnected   = instance.status === "connected"
  const reconnecting  = instance.status === "connecting" || (instance.reconnect_attempts > 0 && instance.status === "disconnected")
  const stale         = hbAgeMin > 20

  let healthLabel: string
  let healthColor: string
  let HealthIcon = Heart

  if (isConnected && !stale) {
    healthLabel = "Conexão saudável"
    healthColor = "text-green-600 bg-green-50 border-green-200"
    HealthIcon  = CheckCircle2
  } else if (reconnecting) {
    healthLabel = `Reconectando automaticamente (${instance.reconnect_attempts}/3)`
    healthColor = "text-amber-600 bg-amber-50 border-amber-200"
    HealthIcon  = RefreshCw
  } else if (stale) {
    healthLabel = "Sem verificação recente — health-check parou?"
    healthColor = "text-amber-600 bg-amber-50 border-amber-200"
    HealthIcon  = AlertCircle
  } else {
    healthLabel = "Desconectado — escaneie o QR Code novamente"
    healthColor = "text-red-600 bg-red-50 border-red-200"
    HealthIcon  = AlertCircle
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Heart className="size-4 text-rose-500" />
        <h2 className="text-sm font-semibold text-slate-900">Saúde da Conexão</h2>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {isChecking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Verificar agora
        </button>
      </div>

      <div className="p-5 space-y-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${healthColor}`}>
          <HealthIcon className={`size-4 ${reconnecting ? "animate-spin" : ""}`} />
          <span className="text-xs font-semibold">{healthLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="px-3 py-2 rounded-lg bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Última verificação</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{formatRelative(hb)}</p>
            {hb && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(hb).toLocaleString("pt-BR")}</p>}
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status atual</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5 capitalize">{instance.status}</p>
            {instance.reconnect_attempts > 0 && (
              <p className="text-[10px] text-amber-600 mt-0.5">
                {instance.reconnect_attempts} tentativa(s) de reconexão
              </p>
            )}
          </div>
        </div>

        {hasError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
            <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-0.5">Último erro</p>
            <p className="text-[11px] text-red-700">{instance.last_error}</p>
          </div>
        )}

        <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
          <p className="font-semibold text-slate-700 mb-1">⚙️ Como funciona o health-check</p>
          <p>Um cron externo deve chamar <code className="bg-white px-1 rounded font-mono">GET /api/cron/evolution-health</code> a cada 15 min. O serviço verifica o estado real na Evolution e, se cair, tenta reconectar automaticamente (até 3 vezes).</p>
        </div>
      </div>
    </div>
  )
}

export function ConfigPageClient({ instance, quickReplies: initialReplies }: Props) {
  const [isPending, startTransition] = useTransition()

  // Form state
  const [evolutionUrl, setUrl]       = useState(instance?.evolution_url ?? "")
  const [evolutionKey, setKey]       = useState(instance?.evolution_key ?? "")
  const [instanceName, setInstName]  = useState(instance?.instance_name ?? "")
  const [webhookUrl, setWebhookUrl]  = useState(instance?.webhook_url ?? "")
  const [saved, setSaved]            = useState(false)
  const [error, setError]            = useState<string | null>(null)

  // Quick replies
  const [replies, setReplies]         = useState(initialReplies)
  const [newShortcut, setNewShortcut] = useState("")
  const [newTitle, setNewTitle]       = useState("")
  const [newContent, setNewContent]   = useState("")

  function handleSaveConfig() {
    if (!evolutionUrl || !evolutionKey || !instanceName) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }

    startTransition(async () => {
      try {
        await saveWhatsAppConfig({
          evolution_url:  evolutionUrl,
          evolution_key:  evolutionKey,
          instance_name:  instanceName,
          webhook_url:    webhookUrl || undefined,
        })
        setSaved(true)
        setError(null)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  function handleConfigWebhook() {
    if (!webhookUrl) return
    startTransition(async () => {
      try {
        await configureWebhook(webhookUrl)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  function handleDisconnect() {
    if (!confirm("Deseja realmente desconectar o WhatsApp?")) return
    startTransition(async () => {
      try {
        await disconnectWhatsApp()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  function handleAddReply() {
    if (!newShortcut || !newTitle || !newContent) return
    startTransition(async () => {
      await createQuickReply({ shortcut: newShortcut, title: newTitle, content: newContent })
      setNewShortcut("")
      setNewTitle("")
      setNewContent("")
    })
  }

  function handleDeleteReply(id: string) {
    startTransition(async () => {
      await deleteQuickReply(id)
      setReplies((prev) => prev.filter((r) => r.id !== id))
    })
  }

  const isConnected = instance?.status === "connected"

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Conexão Evolution API ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Server className="size-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Conexão Evolution API</h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <Globe className="size-3 inline mr-1" />
                URL da Evolution API *
              </label>
              <input
                type="url"
                value={evolutionUrl}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://evolution.seuservidor.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <Key className="size-3 inline mr-1" />
                API Key Global *
              </label>
              <input
                type="password"
                value={evolutionKey}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Sua chave da Evolution API"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <Zap className="size-3 inline mr-1" />
              Nome da Instância *
            </label>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstName(e.target.value)}
              placeholder="Ex: Financeiro, Marketing, MeuWhatsApp"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Use o nome exato da instância criada na Evolution API.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <p className="text-xs text-green-600 font-medium">✓ Configuração salva com sucesso!</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar Configuração
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                <WifiOff className="size-4" />
                Desconectar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Saúde / Heartbeat ── */}
      {instance && <HealthCard instance={instance} />}

      {/* ── Status da Conexão / QR Code ── */}
      {instance && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            {isConnected ? (
              <Wifi className="size-4 text-green-600" />
            ) : (
              <WifiOff className="size-4 text-slate-400" />
            )}
            <h2 className="text-sm font-semibold text-slate-900">Status da Conexão</h2>
            {instance.phone_number && (
              <span className="text-xs text-slate-400 font-mono ml-auto">
                {instance.phone_number}
              </span>
            )}
          </div>

          <QrCodeScanner initialStatus={instance.status} />
        </div>
      )}

      {/* ── Webhook ── */}
      {instance && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Link2 className="size-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Webhook</h2>
          </div>
          <div className="p-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL do Webhook
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seucrm.com/api/webhooks/evolution"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-slate-400 font-mono"
              />
              <button
                type="button"
                onClick={handleConfigWebhook}
                disabled={isPending || !webhookUrl}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap className="size-3.5" />
                Configurar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Após fazer deploy do CRM, configure o webhook com a URL pública: <code className="bg-slate-100 px-1 rounded">https://seucrm.com/api/webhooks/evolution</code>
            </p>
          </div>
        </div>
      )}

      {/* ── Respostas Rápidas ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <MessageSquare className="size-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Respostas Rápidas</h2>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
            {replies.length} atalhos
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* New reply form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={newShortcut}
              onChange={(e) => setNewShortcut(e.target.value)}
              placeholder="/atalho"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400 font-mono"
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
            />
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Conteúdo da resposta"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleAddReply}
              disabled={isPending || !newShortcut || !newTitle || !newContent}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              Adicionar
            </button>
          </div>

          {/* List */}
          {replies.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {replies.map((qr) => (
                <div
                  key={qr.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                    {qr.shortcut}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{qr.title}</p>
                    <p className="text-xs text-slate-500 truncate">{qr.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteReply(qr.id)}
                    className="size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {replies.length === 0 && (
            <div className="text-center py-6">
              <MessageSquare className="size-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Nenhuma resposta rápida. Crie atalhos como <code className="bg-slate-100 px-1 rounded">/preco</code> para agilizar o atendimento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
