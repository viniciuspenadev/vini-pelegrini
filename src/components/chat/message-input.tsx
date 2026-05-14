"use client"

import { useState, useRef, useTransition } from "react"
import { Send, Paperclip, Lock, Smile, X, Loader2, Image as ImageIcon, FileText, Music } from "lucide-react"
import { sendMessage, sendChatMedia } from "@/lib/actions/chat"
import { EmojiPicker } from "./emoji-picker"
import type { ChatQuickReply } from "@/types/chat"

interface Props {
  conversationId: string
  quickReplies:   ChatQuickReply[]
  disabled?:      boolean
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/ogg,audio/wav,audio/mp4,video/mp4,video/quicktime,application/pdf,text/plain,text/csv"

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon
  if (mime.startsWith("audio/")) return Music
  return FileText
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export function MessageInput({ conversationId, quickReplies, disabled }: Props) {
  const [text, setText]                = useState("")
  const [isPrivate, setIsPrivate]      = useState(false)
  const [showQuickReplies, setShowQR]  = useState(false)
  const [filteredReplies, setFiltered] = useState<ChatQuickReply[]>([])
  const [showEmoji, setShowEmoji]      = useState(false)
  const [attachedFile, setFile]        = useState<File | null>(null)
  const [filePreview, setFilePreview]  = useState<string | null>(null)
  const [isPending, startTransition]   = useTransition()
  const inputRef                       = useRef<HTMLTextAreaElement>(null)
  const fileInputRef                   = useRef<HTMLInputElement>(null)

  function handleInput(value: string) {
    setText(value)
    if (value.startsWith("/") && value.length > 1) {
      const search = value.toLowerCase()
      const matches = quickReplies.filter(
        (qr) => qr.shortcut.toLowerCase().includes(search) || qr.title.toLowerCase().includes(search.slice(1))
      )
      setFiltered(matches)
      setShowQR(matches.length > 0)
    } else {
      setShowQR(false)
    }
  }

  function selectQuickReply(qr: ChatQuickReply) {
    setText(qr.content)
    setShowQR(false)
    inputRef.current?.focus()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    // Max 16MB
    if (f.size > 16 * 1024 * 1024) {
      alert("Arquivo máximo 16MB")
      return
    }

    setFile(f)
    if (f.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(f)
    } else {
      setFilePreview(null)
    }
  }

  function clearFile() {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function insertEmoji(emoji: string) {
    const el = inputRef.current
    if (!el) {
      setText((t) => t + emoji)
      return
    }
    const start = el.selectionStart ?? text.length
    const end   = el.selectionEnd ?? text.length
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    // foca de volta e move cursor
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + emoji.length
    })
  }

  function handleSubmit() {
    // Se tem arquivo, envia mídia (caption = text); senão, texto puro
    if (attachedFile) {
      startTransition(async () => {
        try {
          const fd = new FormData()
          fd.append("file", attachedFile)
          if (text.trim()) fd.append("caption", text.trim())
          await sendChatMedia(conversationId, fd)
          clearFile()
          setText("")
        } catch (err: any) {
          alert(err.message ?? "Erro ao enviar mídia")
        }
      })
      return
    }

    const trimmed = text.trim()
    if (!trimmed || isPending) return

    startTransition(async () => {
      try {
        await sendMessage(conversationId, trimmed, isPrivate)
        setText("")
        setIsPrivate(false)
      } catch (err: any) {
        alert(err.message ?? "Erro ao enviar")
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasContent = !!attachedFile || text.trim().length > 0

  return (
    <div className="border-t border-slate-200 bg-white relative">

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="border-b border-slate-100 max-h-40 overflow-y-auto">
          {filteredReplies.map((qr) => (
            <button
              key={qr.id}
              type="button"
              onClick={() => selectQuickReply(qr)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors"
            >
              <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {qr.shortcut}
              </span>
              <span className="text-sm text-slate-700 truncate">{qr.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Nota privada indicator */}
      {isPrivate && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
          <Lock className="size-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">
            Nota privada — não será enviada ao cliente
          </span>
        </div>
      )}

      {/* Preview do arquivo selecionado */}
      {attachedFile && (
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={filePreview} alt="" className="size-12 rounded object-cover" />
            ) : (
              <div className="size-12 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                {(() => {
                  const Icon = fileIcon(attachedFile.type)
                  return <Icon className="size-5" />
                })()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{attachedFile.name}</p>
              <p className="text-[11px] text-slate-400">{formatBytes(attachedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              disabled={isPending}
              className="size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji picker (popover) */}
      {showEmoji && (
        <div className="absolute bottom-full mb-2 left-3 z-30">
          <EmojiPicker
            onSelect={insertEmoji}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex gap-1 shrink-0 pb-1">
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            disabled={!!attachedFile}
            title={attachedFile ? "Mídia sempre vai ao cliente" : (isPrivate ? "Voltar para mensagem normal" : "Nota privada")}
            className={`size-8 flex items-center justify-center rounded-lg transition-colors ${
              isPrivate
                ? "bg-amber-100 text-amber-700"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <Lock className="size-4" />
          </button>

          {/* Anexar */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPrivate || isPending}
            title="Anexar arquivo"
            className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Paperclip className="size-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileSelected}
            className="sr-only"
          />

          {/* Emoji */}
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            title="Emoji"
            className={`size-8 flex items-center justify-center rounded-lg transition-colors ${
              showEmoji ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Smile className="size-4" />
          </button>
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFile ? "Legenda (opcional)..." :
              isPrivate ? "Escreva uma nota interna..." :
              "Digite uma mensagem... (/ para atalhos)"
            }
            disabled={disabled || isPending}
            rows={1}
            className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all max-h-32 ${
              isPrivate
                ? "border-amber-200 bg-amber-50/50 focus:ring-amber-300"
                : "border-slate-200 bg-slate-50 focus:ring-blue-300"
            } disabled:opacity-50`}
            style={{ minHeight: "42px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasContent || isPending || disabled}
          className={`size-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
            hasContent
              ? isPrivate
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30"
              : "bg-slate-100 text-slate-300"
          } disabled:opacity-50`}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  )
}
