"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { formatPhoneDisplay } from "@/lib/evolution-api"
import { lifecycleMeta } from "@/lib/lifecycle"
import { ChannelIcon } from "@/components/ui/channel-icon"
import { qualifyLead, markUnfit, startNewDealForCustomer } from "@/lib/actions/chat"
import {
  User, Phone, CheckCircle2, Clock, XCircle, Target, Ban,
  ChevronDown, UserPlus, MoreHorizontal, Users, Plus, Loader2,
} from "lucide-react"
import type { ChatMessage, ChatConversation, ChatQuickReply } from "@/types/chat"

interface Props {
  conversation: ChatConversation
  messages:     ChatMessage[]
  quickReplies: ChatQuickReply[]
  agents:       Array<{ id: string; full_name: string | null }>
  onStatusChange: (status: string) => void
  onAssign:       (agentId: string | null) => void
}

const STATUS_OPTIONS = [
  { key: "open",     label: "Aberto",    icon: Clock,         color: "text-blue-600 bg-blue-50" },
  { key: "pending",  label: "Pendente",  icon: Clock,         color: "text-amber-600 bg-amber-50" },
  { key: "resolved", label: "Resolvido", icon: CheckCircle2,  color: "text-green-600 bg-green-50" },
  { key: "snoozed",  label: "Adiado",    icon: XCircle,       color: "text-slate-500 bg-slate-100" },
]

export function ChatPanel({ conversation, messages, quickReplies, agents, onStatusChange, onAssign }: Props) {
  const messagesEndRef     = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevConvIdRef      = useRef<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showUnfitModal, setShowUnfitModal] = useState(false)
  const [unfitReason, setUnfitReason]       = useState("")

  const contact = conversation.chat_contacts
  const name    = contact?.customers?.nome_fantasia ?? contact?.customers?.razao_social ?? contact?.push_name ?? formatPhoneDisplay(contact?.phone_number ?? "")
  const phone   = contact?.phone_number ? formatPhoneDisplay(contact.phone_number) : ""

  const currentStatus = STATUS_OPTIONS.find((s) => s.key === conversation.status) ?? STATUS_OPTIONS[0]

  // Estado de lifecycle (puxado do contato)
  const lifecycle = contact?.lifecycle_stage ?? "contact"
  const lc        = lifecycleMeta(lifecycle)
  const channelSource = contact?.source ?? null

  // Quando mostrar botões:
  //  - "Qualificar" → contato em triagem (lifecycle=contact) E conversa não é grupo
  //  - "Sem fit"    → mesmo cenário
  //  - "Novo deal"  → cliente ativo/cliente sem deal ativo
  const showQualify = !conversation.is_group && lifecycle === "contact"
  const showUnfit   = !conversation.is_group && (lifecycle === "contact" || lifecycle === "lead")
  const showNewDeal = !conversation.is_group
                   && ["customer", "active_customer", "inactive_customer"].includes(lifecycle)
                   && !conversation.stage_id

  function handleQualify() {
    startTransition(async () => {
      try { await qualifyLead(conversation.id) } catch (e) { alert((e as Error).message) }
    })
  }

  function handleUnfitConfirm() {
    const reason = unfitReason.trim() || undefined
    startTransition(async () => {
      try {
        await markUnfit(conversation.id, reason)
        setShowUnfitModal(false)
        setUnfitReason("")
      } catch (e) { alert((e as Error).message) }
    })
  }

  function handleNewDeal() {
    startTransition(async () => {
      try { await startNewDealForCustomer(conversation.id) } catch (e) { alert((e as Error).message) }
    })
  }

  // Auto-scroll robusto: força scroll após cada imagem/áudio carregar
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    prevConvIdRef.current = conversation.id

    function forceBottom() {
      if (!container) return
      container.scrollTop = container.scrollHeight
    }

    // 1. Scroll imediato (textos já estão renderizados)
    forceBottom()

    // 2. Re-scroll após cada imagem/vídeo dentro do container carregar
    //    (imagens aumentam a altura DEPOIS de baixar)
    const mediaElements = container.querySelectorAll("img, video, audio")
    const cleanups: Array<() => void> = []

    mediaElements.forEach((el) => {
      const onLoad = () => forceBottom()
      el.addEventListener("load", onLoad)
      el.addEventListener("loadedmetadata", onLoad)
      el.addEventListener("error", onLoad)  // mesmo se falhar, re-scroll pra ignorar o erro visual
      cleanups.push(() => {
        el.removeEventListener("load", onLoad)
        el.removeEventListener("loadedmetadata", onLoad)
        el.removeEventListener("error", onLoad)
      })
    })

    // 3. Re-scroll após um delay maior (pega fontes carregando, layout reflow)
    const t1 = setTimeout(forceBottom, 100)
    const t2 = setTimeout(forceBottom, 400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      cleanups.forEach((fn) => fn())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, messages.length])

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {conversation.is_group ? (
            conversation.group_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.group_picture}
                alt=""
                className="size-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="size-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <Users className="size-5 text-white" />
              </div>
            )
          ) : contact?.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contact.profile_pic_url}
              alt=""
              className="size-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="size-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">
                {(contact?.push_name ?? name)?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
              {conversation.is_group && <Users className="size-3 text-amber-600 shrink-0" />}
              {conversation.is_group
                ? (conversation.group_name ?? "Grupo sem nome")
                : name}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {conversation.is_group ? (
                <span className="text-[11px] text-slate-400">
                  {conversation.group_members?.length ?? 0} membros • grupo
                </span>
              ) : (
                <>
                  {phone && (
                    <span className="text-[11px] text-slate-400 font-mono">{phone}</span>
                  )}
                  {/* Badge de lifecycle */}
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${lc.bg} ${lc.text}`}
                    title={lc.label}
                  >
                    {lc.icon} {lc.label}
                  </span>
                  {/* Badge de canal */}
                  {channelSource && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white border border-slate-200">
                      <ChannelIcon source={channelSource} size={12} />
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Lifecycle actions — só aparecem no contexto certo */}
          {showQualify && (
            <button
              type="button"
              onClick={handleQualify}
              disabled={isPending}
              title="Promover para Lead e adicionar ao funil"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Target className="size-3.5" />}
              Qualificar
            </button>
          )}
          {showUnfit && (
            <button
              type="button"
              onClick={() => setShowUnfitModal(true)}
              disabled={isPending}
              title="Marcar como sem fit (sai do funil)"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Ban className="size-3.5" /> Sem fit
            </button>
          )}
          {showNewDeal && (
            <button
              type="button"
              onClick={handleNewDeal}
              disabled={isPending}
              title="Criar novo deal pra este cliente"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Novo deal
            </button>
          )}

          {/* Status */}
          <div className="relative group">
            <button
              type="button"
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${currentStatus.color}`}
            >
              <currentStatus.icon className="size-3.5" />
              {currentStatus.label}
              <ChevronDown className="size-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[140px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onStatusChange(opt.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors ${
                    opt.key === conversation.status ? "text-blue-600" : "text-slate-700"
                  }`}
                >
                  <opt.icon className="size-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <UserPlus className="size-3.5" />
              {conversation.profiles?.full_name ?? "Atribuir"}
              <ChevronDown className="size-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                type="button"
                onClick={() => onAssign(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
              >
                <User className="size-3.5" />
                Sem atribuição
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onAssign(agent.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 ${
                    agent.id === conversation.assigned_to ? "text-blue-600 font-semibold" : "text-slate-700"
                  }`}
                >
                  <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-blue-600">
                      {agent.full_name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  {agent.full_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-1"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)", backgroundSize: "20px 20px" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Phone className="size-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500 mb-1">Nenhuma mensagem</p>
            <p className="text-xs text-slate-400">As mensagens aparecerão aqui quando o contato enviar algo.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              agentName={msg.sender_type === "agent" ? msg.profiles?.full_name : null}
              senderLabel={
                msg.sender_type !== "contact"
                  ? null
                  : conversation.is_group && msg.group_participant_jid
                    // Em grupo: telefone do participante que mandou
                    ? formatPhoneDisplay(msg.group_participant_jid.split("@")[0])
                    // Em 1-1: nome do contato/cliente
                    : name
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversation.id}
        quickReplies={quickReplies}
        disabled={conversation.status === "resolved"}
      />

      {/* Modal — motivo de "Sem fit" */}
      {showUnfitModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUnfitModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-slate-900 mb-2">Marcar como sem fit</h3>
            <p className="text-xs text-slate-500 mb-3">
              A conversa continua aberta no inbox, mas sai do funil. Opcionalmente diga o motivo.
            </p>
            <textarea
              value={unfitReason}
              onChange={(e) => setUnfitReason(e.target.value)}
              placeholder="Ex: ticket muito baixo, fora da área de entrega, errou número..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowUnfitModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleUnfitConfirm}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
