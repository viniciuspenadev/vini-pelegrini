"use client"

import { useState } from "react"
import {
  Check, CheckCheck, Clock, AlertCircle, Lock, FileText, MapPin, Mic, Video,
  Image as ImageIcon, Download, X, ImageOff,
} from "lucide-react"
import type { ChatMessage } from "@/types/chat"
import { AudioPlayer } from "./audio-player"

interface Props {
  message:    ChatMessage
  agentName?: string | null
  /** Para conversas de grupo: nome do participante (se conhecido) ou número formatado. */
  senderLabel?: string | null
}

export function MessageBubble({ message, agentName, senderLabel }: Props) {
  const isIncoming = message.sender_type === "contact"
  const isSystem   = message.sender_type === "system"
  const isNote     = message.is_private_note
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imageBroken, setImageBroken]   = useState(false)

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
        {/* Nome do remetente — mensagens recebidas */}
        {isIncoming && senderLabel && (
          <p className="text-[10px] font-semibold text-blue-600 mb-0.5 truncate">
            {senderLabel}
          </p>
        )}

        {/* Agent name for outgoing */}
        {!isIncoming && agentName && (
          <p className="text-[10px] font-medium text-blue-200 mb-0.5">
            {agentName}
          </p>
        )}

        {/* Mídia renderizada de verdade */}
        {message.content_type === "image" && message.media_url && !imageBroken && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block -mx-2 -mt-1.5 mb-1.5 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.media_url}
              alt={message.media_file_name ?? "Imagem"}
              onError={() => setImageBroken(true)}
              className="max-w-full max-h-80 object-cover"
            />
          </button>
        )}

        {/* Fallback quando a imagem não carrega (mensagens antigas com URL criptografada do WhatsApp) */}
        {message.content_type === "image" && (!message.media_url || imageBroken) && (
          <div className={`flex items-center gap-2 -mx-1 mb-1.5 px-3 py-3 rounded-lg ${
            isIncoming ? "bg-slate-50 border border-slate-200" : "bg-blue-500/30"
          }`}>
            <ImageOff className={`size-5 shrink-0 ${isIncoming ? "text-slate-400" : "text-blue-100"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${isIncoming ? "text-slate-700" : "text-white"}`}>
                Imagem indisponível
              </p>
              <p className={`text-[10px] ${isIncoming ? "text-slate-400" : "text-blue-200"}`}>
                Mensagem antiga — não foi possível baixar
              </p>
            </div>
          </div>
        )}

        {message.content_type === "audio" && message.media_url && (
          <AudioPlayer src={message.media_url} incoming={isIncoming} />
        )}

        {message.content_type === "video" && message.media_url && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block -mx-2 -mt-1.5 mb-1.5 rounded-lg overflow-hidden bg-black"
          >
            <video src={message.media_url} className="max-w-full max-h-80" controls />
          </button>
        )}

        {message.content_type === "document" && message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            download={message.media_file_name ?? undefined}
            className={`flex items-center gap-2.5 -mx-1 mb-1.5 p-2 rounded-lg transition-colors ${
              isIncoming
                ? "bg-slate-50 hover:bg-slate-100"
                : "bg-blue-500/30 hover:bg-blue-500/50"
            }`}
          >
            <div className={`size-9 rounded-md flex items-center justify-center shrink-0 ${
              isIncoming ? "bg-white" : "bg-blue-400/30"
            }`}>
              <FileText className={`size-4 ${isIncoming ? "text-blue-600" : "text-white"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${isIncoming ? "text-slate-900" : "text-white"}`}>
                {message.media_file_name ?? "Documento"}
              </p>
              <p className={`text-[10px] ${isIncoming ? "text-slate-400" : "text-blue-200"}`}>
                Clique para baixar
              </p>
            </div>
            <Download className={`size-3.5 shrink-0 ${isIncoming ? "text-slate-400" : "text-blue-100"}`} />
          </a>
        )}

        {/* Indicador de mídia sem URL (caso a Evolution não baixou ainda) */}
        {mediaIcon && message.content_type !== "text" && !message.media_url && (
          <div className={`flex items-center gap-1.5 mb-1 ${isIncoming ? "text-slate-500" : "text-blue-200"}`}>
            {mediaIcon}
            <span className="text-[11px] font-medium capitalize italic">
              {message.media_file_name ?? message.content_type}
            </span>
          </div>
        )}

        {/* Message content / caption */}
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

      {/* Lightbox para imagem/vídeo em tela cheia */}
      {lightboxOpen && message.media_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="size-5" />
          </button>
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            download={message.media_file_name ?? undefined}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Baixar"
          >
            <Download className="size-5" />
          </a>
          {message.content_type === "video" ? (
            <video
              src={message.media_url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.media_url}
              alt={message.media_file_name ?? "Imagem"}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
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
