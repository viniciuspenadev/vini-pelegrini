"use client"

import { useState, useRef, useTransition } from "react"
import { Send, Paperclip, Lock, Smile } from "lucide-react"
import { sendMessage } from "@/lib/actions/chat"
import type { ChatQuickReply } from "@/types/chat"

interface Props {
  conversationId: string
  quickReplies:   ChatQuickReply[]
  disabled?:      boolean
}

export function MessageInput({ conversationId, quickReplies, disabled }: Props) {
  const [text, setText]               = useState("")
  const [isPrivate, setIsPrivate]     = useState(false)
  const [showQuickReplies, setShowQR] = useState(false)
  const [filteredReplies, setFiltered] = useState<ChatQuickReply[]>([])
  const [isPending, startTransition]  = useTransition()
  const inputRef                      = useRef<HTMLTextAreaElement>(null)

  function handleInput(value: string) {
    setText(value)

    // Detecta /atalho para quick replies
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

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || isPending) return

    startTransition(async () => {
      try {
        await sendMessage(conversationId, trimmed, isPrivate)
        setText("")
        setIsPrivate(false)
      } catch (err) {
        console.error("Erro ao enviar:", err)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Quick Replies dropdown */}
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

      {/* Private note indicator */}
      {isPrivate && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
          <Lock className="size-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">
            Nota privada — não será enviada ao cliente
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex gap-1 shrink-0 pb-1">
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            title={isPrivate ? "Voltar para mensagem normal" : "Nota privada"}
            className={`size-8 flex items-center justify-center rounded-lg transition-colors ${
              isPrivate
                ? "bg-amber-100 text-amber-700"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Lock className="size-4" />
          </button>
          <button
            type="button"
            title="Anexar arquivo"
            disabled
            className="size-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"
          >
            <Paperclip className="size-4" />
          </button>
          <button
            type="button"
            title="Emoji"
            disabled
            className="size-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"
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
            placeholder={isPrivate ? "Escreva uma nota interna..." : "Digite uma mensagem... (/ para atalhos)"}
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
          disabled={!text.trim() || isPending || disabled}
          className={`size-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
            text.trim()
              ? isPrivate
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30"
              : "bg-slate-100 text-slate-300"
          } disabled:opacity-50`}
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
