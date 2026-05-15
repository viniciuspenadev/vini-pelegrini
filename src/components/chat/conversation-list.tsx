"use client"

import { useState, useMemo } from "react"
import {
  Search, MessageCircle, User, UserCheck, AlertCircle,
  Image as ImageIcon, Mic, Video, FileText, Filter, X, Plus,
} from "lucide-react"
import { formatPhoneDisplay } from "@/lib/evolution-api"
import { NewConversationModal } from "./new-conversation-modal"
import type { ChatConversation } from "@/types/chat"

interface PipelineMini { id: string; name: string; color: string; is_default: boolean }
interface StageMini    { id: string; pipeline_id: string; name: string; color: string; position: number; is_won: boolean; is_lost: boolean }
interface TagMini      { id: string; name: string; color: string }
interface AgentMini    { id: string; full_name: string | null }

interface Props {
  conversations:  ChatConversation[]
  activeId:       string | null
  onSelect:       (id: string) => void
  statusFilter:   string
  onStatusChange: (status: string) => void
  pipelines:      PipelineMini[]
  stages:         StageMini[]
  tags:           TagMini[]
  tagsByContact:  Record<string, string[]>
  agents:         AgentMini[]
}

const STATUS_TABS = [
  { key: "open",     label: "Abertos" },
  { key: "pending",  label: "Pendentes" },
  { key: "resolved", label: "Resolvidos" },
]

const STALE_HOURS_THRESHOLD = 24  // alerta se sem resposta há > 24h

// Ícone do tipo de mídia da última msg (extrai de last_message_preview se for emoji 📷/🎤/etc)
function inferMediaIcon(preview: string | null): React.ReactNode | null {
  if (!preview) return null
  if (preview.startsWith("📷")) return <ImageIcon className="size-3 text-slate-400" />
  if (preview.startsWith("🎤")) return <Mic        className="size-3 text-slate-400" />
  if (preview.startsWith("📹")) return <Video      className="size-3 text-slate-400" />
  if (preview.startsWith("📎")) return <FileText   className="size-3 text-slate-400" />
  return null
}

function hoursSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (60 * 60 * 1000))
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}m`
  if (hrs < 24)  return `${hrs}h`
  if (days < 7)  return `${days}d`
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export function ConversationList({
  conversations, activeId, onSelect, statusFilter, onStatusChange,
  pipelines, stages, tags, tagsByContact, agents,
}: Props) {
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [pipelineFilter, setPipelineFilter] = useState<string>("")
  const [tagFilter, setTagFilter]           = useState<string>("")
  const [agentFilter, setAgentFilter]       = useState<string>("")
  const [staleOnly, setStaleOnly]           = useState(false)
  const [showNewModal, setShowNewModal]     = useState(false)

  const stageById = useMemo(() => {
    const m: Record<string, StageMini> = {}
    for (const s of stages) m[s.id] = s
    return m
  }, [stages])

  const tagById = useMemo(() => {
    const m: Record<string, TagMini> = {}
    for (const t of tags) m[t.id] = t
    return m
  }, [tags])

  const filtered = useMemo(() => {
    let items = conversations.filter((c) => c.status === statusFilter)

    if (pipelineFilter) items = items.filter((c) => (c as any).pipeline_id === pipelineFilter)
    if (agentFilter)   items = items.filter((c) => c.assigned_to === agentFilter)
    if (tagFilter) {
      items = items.filter((c) => {
        const contactTags = tagsByContact[c.contact_id] ?? []
        return contactTags.includes(tagFilter)
      })
    }
    if (staleOnly) {
      items = items.filter((c) => c.last_message_at && hoursSince(c.last_message_at) >= STALE_HOURS_THRESHOLD)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((c) => {
        const contact  = c.chat_contacts
        const name     = contact?.push_name ?? contact?.phone_number ?? ""
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
  }, [conversations, statusFilter, search, pipelineFilter, tagFilter, agentFilter, staleOnly, tagsByContact])

  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    conversations.forEach((c) => {
      map[c.status] = (map[c.status] ?? 0) + 1
    })
    return map
  }, [conversations])

  const activeFiltersCount =
    (pipelineFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (agentFilter ? 1 : 0) + (staleOnly ? 1 : 0)

  function clearFilters() {
    setPipelineFilter("")
    setTagFilter("")
    setAgentFilter("")
    setStaleOnly(false)
  }

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
          <button
            type="button"
            title="Nova conversa"
            onClick={() => setShowNewModal(true)}
            className="ml-auto size-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Search + Filtros */}
        <div className="flex gap-1.5 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`relative shrink-0 size-9 rounded-lg flex items-center justify-center transition-colors ${
              showFilters || activeFiltersCount > 0
                ? "bg-blue-50 text-blue-600"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
            title="Filtros"
          >
            <Filter className="size-3.5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Painel de filtros expansível */}
        {showFilters && (
          <div className="space-y-1.5 mb-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
            {pipelines.length > 0 && (
              <select
                value={pipelineFilter}
                onChange={(e) => setPipelineFilter(e.target.value)}
                className="w-full h-7 px-2 text-[11px] rounded border border-slate-200 bg-white"
              >
                <option value="">Todos os funis</option>
                {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {tags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full h-7 px-2 text-[11px] rounded border border-slate-200 bg-white"
              >
                <option value="">Todas as tags</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full h-7 px-2 text-[11px] rounded border border-slate-200 bg-white"
            >
              <option value="">Todos os agentes</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name ?? "—"}</option>)}
            </select>
            <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={staleOnly}
                onChange={(e) => setStaleOnly(e.target.checked)}
                className="size-3 rounded border-slate-300"
              />
              Apenas sem resposta há +{STALE_HOURS_THRESHOLD}h
            </label>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full h-6 text-[10px] font-semibold text-slate-500 hover:text-red-500 flex items-center justify-center gap-1"
              >
                <X className="size-2.5" /> Limpar filtros
              </button>
            )}
          </div>
        )}

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
                  active ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1 ${active ? "text-blue-200" : "text-slate-400"}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageCircle className="size-8 text-slate-200 mb-3" />
            <p className="text-xs text-slate-400 text-center">
              {search || activeFiltersCount > 0 ? "Nenhuma conversa encontrada" : "Nenhuma conversa neste filtro"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const contact    = conv.chat_contacts
            const isClient   = !!contact?.customers
            const name       = contact?.customers?.nome_fantasia ?? contact?.customers?.razao_social ?? contact?.push_name ?? formatPhoneDisplay(contact?.phone_number ?? "")
            const initial    = (contact?.push_name ?? name)?.[0]?.toUpperCase() ?? "?"
            const isActive   = conv.id === activeId
            const hasUnread  = conv.unread_count > 0
            const assignedTo = conv.profiles?.full_name
            const stage      = (conv as any).pipeline_stages ?? stageById[(conv as any).stage_id]
            const contactTags = (tagsByContact[conv.contact_id] ?? [])
              .map((tid) => tagById[tid])
              .filter(Boolean)
            const isStale     = conv.last_message_at && hoursSince(conv.last_message_at) >= STALE_HOURS_THRESHOLD && conv.status !== "resolved"
            const timeLabel   = conv.last_message_at ? formatTimeAgo(conv.last_message_at) : ""
            const mediaIcon   = inferMediaIcon(conv.last_message_preview)

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-slate-50 ${
                  isActive
                    ? "bg-blue-50 border-l-2 border-l-blue-600"
                    : "hover:bg-slate-50 border-l-2 border-l-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`size-10 rounded-full flex items-center justify-center overflow-hidden ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {contact?.profile_pic_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={contact.profile_pic_url} alt="" className="size-10 object-cover" />
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
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                      {name}
                    </span>
                    <span className={`text-[10px] shrink-0 ${isStale ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                      {timeLabel}
                    </span>
                  </div>

                  {/* Badges: Cliente/Lead + Stage */}
                  <div className="flex items-center gap-1 flex-wrap mb-1">
                    {isClient ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                        <UserCheck className="size-2.5" /> Cliente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        <User className="size-2.5" /> Lead
                      </span>
                    )}
                    {stage && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: stage.color + "20",
                          color: stage.color,
                          borderColor: stage.color + "40",
                        }}
                        title={`Estágio: ${stage.name}`}
                      >
                        <span className="size-1 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                      </span>
                    )}
                    {contactTags.slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: t.color + "20",
                          color: t.color,
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                    {contactTags.length > 2 && (
                      <span className="text-[9px] text-slate-400">+{contactTags.length - 2}</span>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="flex items-center gap-1.5">
                    {mediaIcon}
                    <p className={`text-xs truncate flex-1 ${hasUnread ? "font-medium text-slate-700" : "text-slate-500"}`}>
                      {conv.last_message_preview ?? "Nova conversa"}
                    </p>
                  </div>

                  {/* Footer: agente + alerta */}
                  {(assignedTo || isStale) && (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {assignedTo && (
                        <div className="flex items-center gap-1 min-w-0">
                          <div className="size-3.5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-bold text-blue-700">{assignedTo[0]?.toUpperCase()}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate">{assignedTo.split(" ")[0]}</span>
                        </div>
                      )}
                      {isStale && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-red-500 font-semibold ml-auto">
                          <AlertCircle className="size-2.5" /> sem resposta
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      <NewConversationModal open={showNewModal} onClose={() => setShowNewModal(false)} />
    </div>
  )
}
