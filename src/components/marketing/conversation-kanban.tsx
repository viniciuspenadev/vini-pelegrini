"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  GripVertical, MessageCircle, Clock, AlertCircle, Trophy, XCircle,
  User, UserCheck, Phone, DollarSign, Calendar, Loader2,
} from "lucide-react"
import { moveConversation } from "@/lib/actions/pipeline"
import { lifecycleMeta } from "@/lib/lifecycle"
import { ChannelIcon } from "@/components/ui/channel-icon"

interface Stage {
  id:              string
  name:            string
  color:           string
  position:        number
  probability_pct: number
  is_won:          boolean
  is_lost:         boolean
}

interface ChatContact {
  id:              string
  push_name:       string | null
  phone_number:    string
  profile_pic_url: string | null
  source:          string | null
  lifecycle_stage: string | null
  customers:       { id: string; razao_social: string; nome_fantasia: string | null } | null
}

interface Conversation {
  id:                   string
  status:               string
  priority:             string
  subject:              string | null
  last_message_at:      string | null
  last_message_preview: string | null
  unread_count:         number
  pipeline_id:          string | null
  stage_id:             string | null
  card_position:        number
  estimated_value:      number | null
  expected_close_date:  string | null
  lost_reason:          string | null
  won_at:               string | null
  lost_at:              string | null
  assigned_to:          string | null
  chat_contacts:        ChatContact | null
  profiles:             { full_name: string | null; email: string } | null
}

interface Props {
  stages:        Stage[]
  conversations: Conversation[]
  orderStats:    Record<string, { count: number; total: number }>
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function formatPhone(phone: string) {
  const clean = phone.replace(/\D/g, "")
  if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  return phone
}

function relativeTime(date: string): { label: string; hot: boolean } {
  const diff = (Date.now() - new Date(date).getTime()) / (60 * 1000)
  if (diff < 1)    return { label: "agora",   hot: false }
  if (diff < 60)   return { label: `${Math.floor(diff)}m`, hot: false }
  if (diff < 60 * 24) {
    const h = Math.floor(diff / 60)
    return { label: `${h}h`, hot: h >= 4 }
  }
  const days = Math.floor(diff / (60 * 24))
  return { label: `${days}d`, hot: true }
}

export function ConversationKanban({ stages, conversations: initial, orderStats }: Props) {
  const [convs, setConvs] = useState(initial)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [dragOverStage, setDragOver]  = useState<string | null>(null)
  const [pending, startTransition]    = useTransition()

  function inStage(stageId: string) {
    return convs
      .filter((c) => c.stage_id === stageId)
      .sort((a, b) => (a.card_position ?? 0) - (b.card_position ?? 0))
  }

  function stageTotal(stageId: string) {
    return inStage(stageId).reduce((s, c) => s + Number(c.estimated_value ?? 0), 0)
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOver(null)
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    setDragOver(stageId)
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    if (!draggingId) return

    const c = convs.find((x) => x.id === draggingId)
    if (!c || c.stage_id === stageId) {
      setDraggingId(null)
      setDragOver(null)
      return
    }

    const newPos = inStage(stageId).length

    // Otimista
    setConvs((prev) => prev.map((x) =>
      x.id === draggingId ? { ...x, stage_id: stageId, card_position: newPos } : x
    ))
    setDraggingId(null)
    setDragOver(null)

    startTransition(async () => {
      try {
        await moveConversation(draggingId, stageId, newPos)
      } catch (err: any) {
        setConvs(initial)
        alert(err.message ?? "Erro ao mover")
      }
    })
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const list   = inStage(stage.id)
        const isOver = dragOverStage === stage.id
        const StageIcon = stage.is_won ? Trophy : stage.is_lost ? XCircle : null

        return (
          <div
            key={stage.id}
            className={`shrink-0 w-80 flex flex-col rounded-xl transition-colors ${
              isOver ? "bg-blue-50 ring-2 ring-blue-300" : "bg-slate-100/60"
            }`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={(e) => handleDrop(e, stage.id)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className="px-3 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold text-slate-900 flex-1 truncate">{stage.name}</span>
                {StageIcon && <StageIcon className="size-3.5 text-slate-400" />}
                <span className="text-[10px] font-bold text-slate-500 tabular-nums bg-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {list.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-mono">
                  {stageTotal(stage.id) > 0 ? BRL(stageTotal(stage.id)) : "—"}
                </span>
                <span className="text-slate-400">{stage.probability_pct}%</span>
              </div>
            </div>

            <div className="flex-1 px-2 py-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
              {list.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conv={conv}
                  isDragging={draggingId === conv.id}
                  onDragStart={(e) => handleDragStart(e, conv.id)}
                  onDragEnd={handleDragEnd}
                  orderStats={orderStats}
                />
              ))}

              {list.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-6">Solte conversas aqui</p>
              )}
            </div>
          </div>
        )
      })}

      {pending && (
        <div className="fixed top-20 right-4 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 text-xs text-slate-600 z-50">
          <Loader2 className="size-3.5 animate-spin text-blue-600" />
          Salvando...
        </div>
      )}
    </div>
  )
}

function ConversationCard({
  conv, isDragging, onDragStart, onDragEnd, orderStats,
}: {
  conv:        Conversation
  isDragging:  boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd:   () => void
  orderStats:  Record<string, { count: number; total: number }>
}) {
  const contact      = conv.chat_contacts
  const customer     = contact?.customers
  const customerName = customer?.nome_fantasia || customer?.razao_social
  const isClient     = !!customer
  const stats        = customer ? orderStats[customer.id] : null

  const displayName  = contact?.push_name ?? (contact?.phone_number ? formatPhone(contact.phone_number) : "Sem nome")
  const initial      = displayName[0]?.toUpperCase() ?? "?"

  const ownerName    = conv.profiles?.full_name?.split(" ")[0]
  const time         = conv.last_message_at ? relativeTime(conv.last_message_at) : null
  const today        = new Date().toISOString().split("T")[0]
  const overdueDate  = conv.expected_close_date && conv.expected_close_date < today && !conv.won_at && !conv.lost_at

  return (
    <Link
      href={`/marketing?conversation=${conv.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`block group bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="p-3 space-y-2">

        {/* Top — avatar + nome + grip */}
        <div className="flex items-start gap-2.5">
          <div className="size-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {contact?.profile_pic_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contact.profile_pic_url} alt="" className="size-9 object-cover" />
            ) : (
              <span className="text-sm font-bold text-slate-500">{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <Phone className="size-2.5" />
              {contact?.phone_number ? formatPhone(contact.phone_number) : "—"}
            </p>
          </div>
          <GripVertical className="size-3 text-slate-300 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Preview da última mensagem */}
        {conv.last_message_preview && (
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-slate-50 rounded px-2 py-1.5">
            <MessageCircle className="size-3 text-slate-400 shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-snug">{conv.last_message_preview}</p>
          </div>
        )}

        {/* Badges: lifecycle + canal + pedidos */}
        <div className="flex items-center gap-1 flex-wrap">
          {(() => {
            const lc = lifecycleMeta(contact?.lifecycle_stage)
            return (
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${lc.bg} ${lc.text}`}
                title={lc.label}
              >
                {lc.icon} {lc.label}
              </span>
            )
          })()}
          {contact?.source && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white border border-slate-200">
              <ChannelIcon source={contact.source} size={11} />
            </span>
          )}

          {stats && stats.count > 0 && (
            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {stats.count} pedido{stats.count === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Nome do cliente (se houver) */}
        {customerName && (
          <p className="text-[10px] text-slate-500 truncate">↳ {customerName}</p>
        )}

        {/* Linha inferior: valor + data + LTV */}
        {(conv.estimated_value || conv.expected_close_date || (stats && stats.total > 0)) && (
          <div className="flex items-center justify-between gap-2 text-[10px] pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              {conv.estimated_value && conv.estimated_value > 0 ? (
                <span className="font-semibold text-slate-700 tabular-nums flex items-center gap-0.5">
                  <DollarSign className="size-2.5" />{BRL(Number(conv.estimated_value)).replace("R$", "").trim()}
                </span>
              ) : stats && stats.total > 0 ? (
                <span className="text-slate-400 tabular-nums" title="Histórico do cliente">
                  LTV {BRL(stats.total).replace("R$", "R$ ")}
                </span>
              ) : null}
            </div>
            {conv.expected_close_date && (
              <span className={`flex items-center gap-0.5 ${overdueDate ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                <Calendar className="size-2.5" />
                {new Date(conv.expected_close_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>
        )}

        {/* Footer: tempo + agent + alertas */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
          {time && (
            <span className={`inline-flex items-center gap-1 text-[10px] ${time.hot ? "text-red-600 font-semibold" : "text-slate-400"}`}>
              {time.hot ? <AlertCircle className="size-2.5" /> : <Clock className="size-2.5" />}
              {time.label} {time.hot && "sem resposta"}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {conv.unread_count > 0 && (
              <span className="size-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {conv.unread_count}
              </span>
            )}
            {ownerName && (
              <div className="size-4 rounded-full bg-blue-100 flex items-center justify-center" title={ownerName}>
                <span className="text-[8px] font-bold text-blue-700">{ownerName[0]?.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
