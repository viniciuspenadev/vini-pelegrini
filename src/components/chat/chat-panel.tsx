"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { formatPhoneDisplay } from "@/lib/evolution-api"
import {
  User, Phone, CheckCircle2, Clock, XCircle,
  ChevronDown, UserPlus, MoreHorizontal,
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const contact = conversation.chat_contacts
  const name    = contact?.customers?.nome_fantasia ?? contact?.customers?.razao_social ?? contact?.push_name ?? formatPhoneDisplay(contact?.phone_number ?? "")
  const phone   = contact?.phone_number ? formatPhoneDisplay(contact.phone_number) : ""

  const currentStatus = STATUS_OPTIONS.find((s) => s.key === conversation.status) ?? STATUS_OPTIONS[0]

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">
              {(contact?.push_name ?? name)?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            <div className="flex items-center gap-2">
              {phone && (
                <span className="text-[11px] text-slate-400 font-mono">{phone}</span>
              )}
              {contact?.customers && (
                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                  Cliente vinculado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
    </div>
  )
}
