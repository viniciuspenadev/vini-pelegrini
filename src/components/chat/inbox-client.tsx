"use client"

import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { ConversationList } from "@/components/chat/conversation-list"
import { ChatPanel } from "@/components/chat/chat-panel"
import { ContactSidebar } from "@/components/chat/contact-sidebar"
import { MessageCircle, WifiOff, Settings } from "lucide-react"
import Link from "next/link"
import {
  assignConversation,
  updateConversationStatus,
  markConversationRead,
  getMessages,
  refreshInbox,
} from "@/lib/actions/chat"
import type {
  ChatConversation,
  ChatMessage,
  ChatContact,
  ChatQuickReply,
} from "@/types/chat"

interface CustomerInfo {
  id:              string
  razao_social:    string
  nome_fantasia:   string | null
  cnpj_cpf:        string
  comprador_nome:  string | null
  email_financeiro: string | null
  cidade:          string | null
  estado:          string | null
}

interface RecentOrder {
  id:                     string
  order_number:           number
  status:                 string
  estimated_total_amount: number
  final_total_amount:     number | null
  created_at:             string
}

interface Props {
  conversations:  ChatConversation[]
  messages:       Record<string, ChatMessage[]>
  contacts:       Record<string, ChatContact>
  customers:      Record<string, CustomerInfo>
  recentOrders:   Record<string, RecentOrder[]>
  quickReplies:   ChatQuickReply[]
  agents:         Array<{ id: string; full_name: string | null }>
  instanceStatus: string
}

export function InboxClient({
  conversations: initialConversations,
  messages: initialMessages,
  contacts: initialContacts,
  customers,
  recentOrders,
  quickReplies,
  agents,
  instanceStatus,
}: Props) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId]           = useState<string | null>(null)
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([])
  const [contacts, setContacts]           = useState(initialContacts)
  const [statusFilter, setStatusFilter]   = useState("open")
  const [loadingMessages, setLoadingMsg]  = useState(false)
  const [, startTransition]               = useTransition()
  const pollRef                           = useRef<NodeJS.Timeout | null>(null)
  const activeIdRef                       = useRef<string | null>(null)

  // Keep ref in sync
  activeIdRef.current = activeId

  const activeConv     = activeId ? conversations.find((c) => c.id === activeId) : null
  const activeContact  = activeConv ? contacts[activeConv.contact_id] : null
  const activeCustomer = activeContact?.customer_id ? customers[activeContact.customer_id] : null
  const activeOrders   = activeContact?.customer_id ? (recentOrders[activeContact.customer_id] ?? []) : []

  // ── Fetch messages for a conversation ──
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await getMessages(convId)
      // Only update if still viewing the same conversation
      if (activeIdRef.current === convId) {
        setActiveMessages(msgs)
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err)
    }
  }, [])

  // ── Select conversation ──
  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
    setActiveMessages([]) // Clear immediately
    setLoadingMsg(true)

    // Fetch messages
    loadMessages(id).finally(() => setLoadingMsg(false))

    // Mark as read
    startTransition(async () => {
      await markConversationRead(id)
      setConversations((prev) =>
        prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c)
      )
    })
  }, [loadMessages])

  // ── Polling: refresh conversations + active messages every 5s ──
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await refreshInbox()
        if (data) {
          setConversations(data.conversations)
          if (data.contacts) {
            setContacts((prev) => ({ ...prev, ...data.contacts }))
          }
        }

        // Refresh active conversation messages
        if (activeIdRef.current) {
          await loadMessages(activeIdRef.current)
        }
      } catch {
        // Silently handle polling errors
      }
    }

    pollRef.current = setInterval(poll, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadMessages])

  const handleStatusChange = useCallback((status: string) => {
    if (!activeId) return
    startTransition(async () => {
      await updateConversationStatus(activeId, status)
      setConversations((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, status: status as ChatConversation["status"] } : c)
      )
    })
  }, [activeId])

  const handleAssign = useCallback((agentId: string | null) => {
    if (!activeId) return
    startTransition(async () => {
      await assignConversation(activeId, agentId)
      setConversations((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, assigned_to: agentId } : c)
      )
    })
  }, [activeId])

  // Not configured
  if (instanceStatus === "not_configured") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-blue-50 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 max-w-md text-center">
          <div className="size-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
            <MessageCircle className="size-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Configure o WhatsApp</h2>
          <p className="text-sm text-slate-500 mb-6">
            Para começar a usar o inbox, primeiro configure sua conexão com a Evolution API e conecte seu número de WhatsApp.
          </p>
          <Link
            href="/marketing/configuracao"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/30 transition-colors"
          >
            <Settings className="size-4" />
            Ir para Configuração
          </Link>
        </div>
      </div>
    )
  }

  // Disconnected
  if (instanceStatus === "disconnected") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-blue-50 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 max-w-md text-center">
          <div className="size-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <WifiOff className="size-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">WhatsApp Desconectado</h2>
          <p className="text-sm text-slate-500 mb-6">
            Seu WhatsApp perdeu a conexão. Reconecte escaneando o QR Code novamente.
          </p>
          <Link
            href="/marketing/configuracao"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Settings className="size-4" />
            Reconectar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation list */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Center: Chat area */}
      <div className="flex-1 min-w-0">
        {activeConv ? (
          <ChatPanel
            conversation={activeConv}
            messages={activeMessages}
            quickReplies={quickReplies}
            agents={agents}
            onStatusChange={handleStatusChange}
            onAssign={handleAssign}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-slate-50">
            <MessageCircle className="size-14 text-slate-200 mb-4" />
            <p className="text-sm font-medium text-slate-500 mb-1">
              Selecione uma conversa
            </p>
            <p className="text-xs text-slate-400">
              Escolha uma conversa ao lado para começar o atendimento.
            </p>
          </div>
        )}
      </div>

      {/* Right: Contact sidebar */}
      {activeConv && activeContact && (
        <ContactSidebar
          contact={activeContact}
          customer={activeCustomer ?? null}
          recentOrders={activeOrders}
        />
      )}
    </div>
  )
}
