"use client"

import { useState, useMemo } from "react"
import { Search, MessageCircle, User, Clock } from "lucide-react"
import { formatPhoneDisplay } from "@/lib/evolution-api"
import type { ChatConversation } from "@/types/chat"

interface Props {
  conversations:  ChatConversation[]
  activeId:       string | null
  onSelect:       (id: string) => void
  statusFilter:   string
  onStatusChange: (status: string) => void
}

const STATUS_TABS = [
  { key: "open",     label: "Abertos" },
  { key: "pending",  label: "Pendentes" },
  { key: "resolved", label: "Resolvidos" },
]

export function ConversationList({ conversations, activeId, onSelect, statusFilter, onStatusChange }: Props) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    let items = conversations.filter((c) => c.status === statusFilter)

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((c) => {
        const contact = c.chat_contacts
        const name    = contact?.push_name ?? contact?.phone_number ?? ""
        const custName = contact?.customers?.nome_fantasia ?? contact?.customers?.razao_social ?? ""
        return name.toLowerCase().includes(q) ||
               custName.toLowerCase().includes(q) ||
               (c.last_message_preview ?? "").toLowerCase().includes(q)
      })
    }

    return items.sort((a, b) => {
      const da = a.last_message_at ?? a.created_at
      const db = b.last_message_at ?? b.created_at
      return new Date(db).getTime() - new Date(da).getTime()
    })
  }, [conversations, statusFilter, search])

  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    conversations.forEach((c) => {
      map[c.status] = (map[c.status] ?? 0) + 1
    })
    return map
  }, [conversations])

  return (
    <div className="flex flex-col h-full border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="size-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Inbox</h2>
          {conversations.filter((c) => c.unread_count > 0).length > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {conversations.reduce((s, c) => s + c.unread_count, 0)}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-slate-400"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => {
            const count  = countByStatus[tab.key] ?? 0
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusChange(tab.key)}
                className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1 ${active ? "text-blue-200" : "text-slate-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageCircle className="size-8 text-slate-200 mb-3" />
            <p className="text-xs text-slate-400 text-center">
              {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa neste filtro"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const contact     = conv.chat_contacts
            const name        = contact?.customers?.nome_fantasia ?? contact?.customers?.razao_social ?? contact?.push_name ?? formatPhoneDisplay(contact?.phone_number ?? "")
            const initial     = (contact?.push_name ?? name)?.[0]?.toUpperCase() ?? "?"
            const isActive    = conv.id === activeId
            const hasUnread   = conv.unread_count > 0
            const assignedTo  = conv.profiles?.full_name

            const timeLabel = conv.last_message_at
              ? formatTimeAgo(conv.last_message_at)
              : ""

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 ${
                  isActive
                    ? "bg-blue-50 border-l-2 border-l-blue-600"
                    : "hover:bg-slate-50 border-l-2 border-l-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`size-10 rounded-full flex items-center justify-center ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {contact?.profile_pic_url ? (
                      <img
                        src={contact.profile_pic_url}
                        alt=""
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold">{initial}</span>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 size-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm truncate ${
                      hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
                    }`}>
                      {name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{timeLabel}</span>
                  </div>
                  <p className={`text-xs truncate ${
                    hasUnread ? "font-medium text-slate-700" : "text-slate-500"
                  }`}>
                    {conv.last_message_preview ?? "Nova conversa"}
                  </p>
                  {assignedTo && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="size-2.5 text-slate-400" />
                      <span className="text-[10px] text-slate-400">{assignedTo}</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now  = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}m`
  if (hrs < 24) return `${hrs}h`
  if (days < 7) return `${days}d`

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
