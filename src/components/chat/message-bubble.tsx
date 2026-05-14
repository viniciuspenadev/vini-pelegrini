"use client"

import { Check, CheckCheck, Clock, AlertCircle, Lock, FileText, MapPin, Mic, Video, Image as ImageIcon } from "lucide-react"
import type { ChatMessage } from "@/types/chat"

interface Props {
  message:    ChatMessage
  agentName?: string | null
}

export function MessageBubble({ message, agentName }: Props) {
  const isIncoming = message.sender_type === "contact"
  const isSystem   = message.sender_type === "system"
  const isNote     = message.is_private_note

  const time = new Date(message.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  // Private note
  if (isNote) {
    return (
      <div className="flex justify-end px-4 py-0.5">
        <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Lock className="size-3 text-amber-500" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
              Nota interna
            </span>
            {agentName && (
              <span className="text-[10px] text-amber-500">• {agentName}</span>
            )}
          </div>
          <p className="text-sm text-amber-900 whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
          <div className="flex justify-end mt-1">
            <span className="text-[10px] text-amber-400">{time}</span>
          </div>
        </div>
      </div>
    )
  }

  // Media content indicator
  const mediaIcon = getMediaIcon(message.content_type)

  return (
    <div className={`flex px-4 py-0.5 ${isIncoming ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isIncoming
            ? "bg-white border border-slate-200 rounded-bl-md shadow-sm"
            : "bg-blue-600 text-white rounded-br-md shadow-sm shadow-blue-600/20"
        }`}
      >
        {/* Agent name for outgoing */}
        {!isIncoming && agentName && (
          <p className="text-[10px] font-medium text-blue-200 mb-0.5">
            {agentName}
          </p>
        )}

        {/* Media indicator */}
        {mediaIcon && message.content_type !== "text" && (
          <div className={`flex items-center gap-1.5 mb-1 ${isIncoming ? "text-slate-500" : "text-blue-200"}`}>
            {mediaIcon}
            <span className="text-[11px] font-medium capitalize">
              {message.media_file_name ?? message.content_type}
            </span>
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${
            isIncoming ? "text-slate-800" : "text-white"
          }`}>
            {message.content}
          </p>
        )}

        {/* Time + status */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${
          isIncoming ? "text-slate-400" : "text-blue-200"
        }`}>
          <span className="text-[10px]">{time}</span>
          {!isIncoming && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Clock className="size-3" />
    case "sent":
      return <Check className="size-3" />
    case "delivered":
      return <CheckCheck className="size-3" />
    case "read":
      return <CheckCheck className="size-3 text-blue-100" />
    case "failed":
      return <AlertCircle className="size-3 text-red-300" />
    default:
      return null
  }
}

function getMediaIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="size-3.5" />
    case "audio":
      return <Mic className="size-3.5" />
    case "video":
      return <Video className="size-3.5" />
    case "document":
      return <FileText className="size-3.5" />
    case "location":
      return <MapPin className="size-3.5" />
    default:
      return null
  }
}
