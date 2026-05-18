"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { formatPhoneDisplay } from "@/lib/evolution-api"
import {
  User, Tag, ShoppingCart, ExternalLink, Mail, MapPin, Phone, FileText, IdCard,
  Trophy, X, Calendar, DollarSign, ChevronDown, AlertTriangle,
  Plus, Search, Building2, Ban, Archive, Trash2, UserPlus,
  CheckCircle2, Loader2, Users, CreditCard,
} from "lucide-react"
import type { IconName } from "@/lib/segments/types"

const ICON_MAP: Record<IconName, typeof User> = {
  "user":           User,
  "users":          Users,
  "mail":           Mail,
  "map-pin":        MapPin,
  "phone":          Phone,
  "file-text":      FileText,
  "id-card":        IdCard,
  "building":       Building2,
  "shopping-cart":  ShoppingCart,
  "credit-card":    CreditCard,
}
import {
  linkCustomerToContact,
  setContactBlocked,
  setContactNotes,
  archiveConversation,
  searchCustomersForLink,
  addConversationParticipant,
  removeConversationParticipant,
} from "@/lib/actions/chat"
import { ConvertToProjectModal, type ConvertModalCustomer } from "@/components/moveis/convert-to-project-modal"
import {
  moveConversation,
  updateConversationDealInfo,
  markConversationWonLost,
} from "@/lib/actions/pipeline"
import { applyTag, removeTag } from "@/lib/actions/tags"
import type { ChatContact, ChatConversation } from "@/types/chat"
import type { SegmentSidebarConfig, FinancialMetricKey } from "@/lib/segments/types"

interface CustomerInfo {
  id:               string
  razao_social:     string
  nome_fantasia:    string | null
  cnpj_cpf:         string
  comprador_nome:   string | null
  email_financeiro: string | null
  telefone:         string | null
  cidade:           string | null
  estado:           string | null
  // Acesso por chave genérica (registry-driven)
  [key: string]: unknown
}

interface RecentOrder {
  id:            string
  order_number:  number
  status:        string
  estimated_total_amount: number
  final_total_amount:     number | null
  created_at:    string
}

interface PipelineMini { id: string; name: string; color: string; is_default: boolean }
interface StageMini    { id: string; pipeline_id: string; name: string; color: string; position: number; is_won: boolean; is_lost: boolean }
interface TagMini      { id: string; name: string; color: string }
interface AgentMini    { id: string; full_name: string | null }

interface CustomerFinancials {
  ltv:                number
  open_orders:        number
  receivable_open:    number
  receivable_overdue: number
  on_time_rate:       number | null
}

interface Props {
  conversation:  ChatConversation
  contact:       ChatContact
  customer:      CustomerInfo | null
  recentOrders:  RecentOrder[]
  financials:    CustomerFinancials | null
  pipelines:     PipelineMini[]
  stages:        StageMini[]
  tags:          TagMini[]
  tagsByContact: Record<string, string[]>
  agents:        AgentMini[]
  segmentConfig: SegmentSidebarConfig
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/** Pega o nome principal a partir dos customerFields marcados como primary. */
function pickPrimaryName(customer: CustomerInfo | null, config: SegmentSidebarConfig): string | null {
  if (!customer) return null
  for (const f of config.customerFields) {
    if (!f.primary) continue
    const v = customer[f.key]
    if (typeof v === "string" && v.trim()) return v
  }
  return null
}

/** Resolve o valor de uma chave de campo, incluindo "cidade_estado" composto. */
function readCustomerField(customer: CustomerInfo, key: string): string | null {
  if (key === "cidade_estado") {
    const parts = [customer.cidade, customer.estado].filter(Boolean) as string[]
    return parts.length > 0 ? parts.join(" / ") : null
  }
  const v = customer[key]
  return typeof v === "string" && v.trim() ? v : null
}

// ─── Sub-componente: Card de Pipeline ──────────────────────────
function PipelineCard({
  conversation, pipelines, stages,
}: {
  conversation: ChatConversation
  pipelines:    PipelineMini[]
  stages:       StageMini[]
}) {
  const [isPending, startTransition] = useTransition()
  const [showStageMenu, setShowStageMenu] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason]       = useState("")

  const [estimatedValue, setEstimatedValue] = useState(
    conversation.estimated_value != null ? String(conversation.estimated_value) : ""
  )
  const [closeDate, setCloseDate] = useState(conversation.expected_close_date ?? "")

  useEffect(() => {
    setEstimatedValue(conversation.estimated_value != null ? String(conversation.estimated_value) : "")
    setCloseDate(conversation.expected_close_date ?? "")
  }, [conversation.id, conversation.estimated_value, conversation.expected_close_date])

  const currentPipeline = pipelines.find((p) => p.id === conversation.pipeline_id)
  const currentStage    = conversation.pipeline_stages
                       ?? stages.find((s) => s.id === conversation.stage_id)
  const pipelineStages  = stages.filter((s) => s.pipeline_id === conversation.pipeline_id)

  function handleMoveStage(stageId: string) {
    startTransition(async () => {
      await moveConversation(conversation.id, stageId, 0)
      setShowStageMenu(false)
    })
  }

  function handleSaveDealInfo() {
    const val = estimatedValue.trim() ? Number(estimatedValue.replace(",", ".")) : null
    startTransition(async () => {
      await updateConversationDealInfo(conversation.id, {
        estimated_value:     Number.isFinite(val) ? val : null,
        expected_close_date: closeDate || null,
      })
    })
  }

  function handleMarkWon() {
    startTransition(async () => {
      try { await markConversationWonLost(conversation.id, "won") } catch (e) { alert((e as Error).message) }
    })
  }

  function handleMarkLost() {
    startTransition(async () => {
      try {
        await markConversationWonLost(conversation.id, "lost", lostReason || undefined)
        setShowLostModal(false)
        setLostReason("")
      } catch (e) { alert((e as Error).message) }
    })
  }

  if (!currentPipeline) {
    return (
      <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/50">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="size-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            Sem funil
          </span>
        </div>
        <p className="text-[11px] text-amber-700">
          Esta conversa não está em nenhum funil. Use o Kanban para atribuir.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: currentPipeline.color }} />
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider truncate">
              {currentPipeline.name}
            </span>
          </div>
        </div>

        {/* Stage atual + dropdown mover */}
        <div className="relative mb-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowStageMenu((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
            style={currentStage ? { borderColor: currentStage.color + "60" } : undefined}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {currentStage && (
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: currentStage.color }} />
              )}
              <span className="text-xs font-semibold text-slate-800 truncate">
                {currentStage?.name ?? "—"}
              </span>
              {currentStage?.is_won && <Trophy className="size-3 text-amber-500 shrink-0" />}
              {currentStage?.is_lost && <X className="size-3 text-red-500 shrink-0" />}
            </div>
            <ChevronDown className="size-3 text-slate-400" />
          </button>

          {showStageMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg py-1 max-h-60 overflow-y-auto z-10">
              {pipelineStages.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleMoveStage(st.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 ${
                    st.id === conversation.stage_id ? "bg-blue-50 font-semibold text-blue-600" : "text-slate-700"
                  }`}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                  <span className="flex-1 text-left">{st.name}</span>
                  {st.is_won && <Trophy className="size-3 text-amber-500" />}
                  {st.is_lost && <X className="size-3 text-red-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Valor e Data */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div>
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <DollarSign className="size-2.5" /> Valor
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              onBlur={handleSaveDealInfo}
              placeholder="0,00"
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <Calendar className="size-2.5" /> Fechamento
            </label>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              onBlur={handleSaveDealInfo}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Botões Ganho / Perdido */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={isPending || currentStage?.is_won}
            onClick={handleMarkWon}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trophy className="size-3" /> Ganho
          </button>
          <button
            type="button"
            disabled={isPending || currentStage?.is_lost}
            onClick={() => setShowLostModal(true)}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <X className="size-3" /> Perdido
          </button>
        </div>

        {conversation.lost_reason && (
          <p className="text-[10px] text-red-600 mt-1.5 italic">Perdido: {conversation.lost_reason}</p>
        )}
      </div>

      {/* Modal de motivo de perda */}
      {showLostModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLostModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-slate-900 mb-2">Marcar como perdido</h3>
            <p className="text-xs text-slate-500 mb-3">Conte rapidamente o motivo (ajuda em análises futuras).</p>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Preço alto, concorrência, sem orçamento..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleMarkLost}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                Confirmar perda
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-componente: Card de Tags ──────────────────────────────
function TagsCard({
  contactId, tags, tagsByContact,
}: {
  contactId:     string
  tags:          TagMini[]
  tagsByContact: Record<string, string[]>
}) {
  const [, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)

  const activeIds   = tagsByContact[contactId] ?? []
  const activeTags  = tags.filter((t) => activeIds.includes(t.id))
  const availTags   = tags.filter((t) => !activeIds.includes(t.id))

  function handleAdd(tagId: string) {
    startTransition(async () => {
      await applyTag(tagId, "contact", contactId)
    })
    setShowAdd(false)
  }

  function handleRemove(tagId: string) {
    startTransition(async () => {
      await removeTag(tagId, "contact", contactId)
    })
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Tags</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="size-5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
        >
          <Plus className="size-3" />
        </button>
      </div>

      {activeTags.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-1">
          {activeTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleRemove(t.id)}
              title="Clique para remover"
              className="group inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: t.color + "20", color: t.color }}
            >
              {t.name}
              <X className="size-2 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic">Nenhuma tag aplicada.</p>
      )}

      {showAdd && availTags.length > 0 && (
        <div className="mt-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 max-h-32 overflow-y-auto">
          <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Adicionar tag</p>
          <div className="flex flex-wrap gap-1">
            {availTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleAdd(t.id)}
                className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full hover:opacity-80"
                style={{ backgroundColor: t.color + "20", color: t.color }}
              >
                + {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAdd && availTags.length === 0 && (
        <p className="text-[10px] text-slate-400 italic mt-1">
          Sem tags disponíveis. <Link href="/marketing/configuracao" className="text-blue-600">Cadastrar</Link>
        </p>
      )}
    </div>
  )
}

// ─── Sub-componente: Vincular cliente ──────────────────────────
function LinkCustomerCard({ contactId }: { contactId: string }) {
  const [search, setSearch]       = useState("")
  const [results, setResults]     = useState<Array<{ id: string; razao_social: string; nome_fantasia: string | null; cnpj_cpf: string }>>([])
  const [searching, setSearching] = useState(false)
  const [, startTransition]       = useTransition()

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await searchCustomersForLink(search)
        setResults(r as any[])
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function handleLink(customerId: string) {
    startTransition(async () => {
      await linkCustomerToContact(contactId, customerId)
    })
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="flex items-center gap-1.5 mb-2">
        <User className="size-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Contato sem cliente
        </span>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente existente..."
          className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        {searching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-blue-500 animate-spin" />}
      </div>

      {results.length > 0 && (
        <div className="space-y-0.5 mb-2 max-h-40 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleLink(c.id)}
              className="w-full flex items-start gap-1.5 px-2 py-1.5 text-left rounded hover:bg-slate-50"
            >
              <Building2 className="size-3 text-green-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-700 truncate">
                  {c.nome_fantasia ?? c.razao_social}
                </p>
                <p className="text-[9px] text-slate-400 font-mono">{c.cnpj_cpf}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Link
        href="/clientes/novo"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Plus className="size-3.5" />
        Cadastrar novo cliente
      </Link>
    </div>
  )
}

// ─── Sub-componente: Mini financeiro ───────────────────────────
const METRIC_META: Record<FinancialMetricKey, { label: string; format: "currency" | "count" | "percent" }> = {
  ltv:                { label: "LTV",          format: "currency" },
  open_orders:        { label: "Em andamento", format: "count"    },
  open_receivable:    { label: "Em aberto",    format: "currency" },
  overdue_receivable: { label: "Vencido",      format: "currency" },
  on_time_rate:       { label: "Pontualidade", format: "percent"  },
  avg_ticket:         { label: "Ticket médio", format: "currency" },
  mrr:                { label: "MRR",          format: "currency" },
}

function FinancialCard({
  financials, metrics, recordLabelPlural,
}: {
  financials:        CustomerFinancials
  metrics:           FinancialMetricKey[]
  recordLabelPlural: string
}) {
  function getValue(key: FinancialMetricKey): number | null {
    switch (key) {
      case "ltv":                return financials.ltv
      case "open_orders":        return financials.open_orders
      case "open_receivable":    return financials.receivable_open
      case "overdue_receivable": return financials.receivable_overdue
      case "on_time_rate":       return financials.on_time_rate
      case "avg_ticket": {
        // Aproximação simples: LTV / max(open_orders, 1)
        return financials.open_orders > 0 ? financials.ltv / financials.open_orders : null
      }
      case "mrr":                return null  // não calculado ainda
    }
  }

  function renderValue(key: FinancialMetricKey, v: number | null): React.ReactNode {
    const meta = METRIC_META[key]
    if (v == null) return <span className="text-slate-400">—</span>
    if (meta.format === "currency") return <span className="tabular-nums">{BRL(v)}</span>
    if (meta.format === "count")    return <span className="tabular-nums">{v}</span>
    if (meta.format === "percent") {
      const pct  = Math.round(v * 100)
      const lbl  = v >= 0.95 ? "Excelente" : v >= 0.8 ? "Bom" : v >= 0.6 ? "Regular" : "Atenção"
      const cls  = v >= 0.95 ? "text-green-600" : v >= 0.8 ? "text-blue-600" : v >= 0.6 ? "text-amber-600" : "text-red-600"
      return <span className={cls}>{pct}% <span className="text-[9px] font-medium">({lbl})</span></span>
    }
  }

  function bgFor(key: FinancialMetricKey, v: number | null): string {
    if (key === "overdue_receivable" && (v ?? 0) > 0) return "bg-red-50"
    return "bg-slate-50"
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="flex items-center gap-1.5 mb-2">
        <DollarSign className="size-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Financeiro</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => {
          const v = getValue(m)
          return (
            <div key={m} className={`px-2 py-1.5 rounded-lg ${bgFor(m, v)}`}>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{METRIC_META[m].label}</p>
              <p className="text-xs font-bold text-slate-800">
                {renderValue(m, v)}
              </p>
            </div>
          )
        })}
      </div>

      {financials.open_orders > 0 && !metrics.includes("open_orders") && (
        <p className="text-[10px] text-slate-500 mt-1.5">
          <span className="font-bold">{financials.open_orders}</span> {recordLabelPlural.toLowerCase()} em andamento.
        </p>
      )}
    </div>
  )
}

// ─── Sub-componente: Participantes ─────────────────────────────
function ParticipantsCard({
  conversation, agents,
}: {
  conversation: ChatConversation
  agents:       AgentMini[]
}) {
  const [, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)

  const participantIds = conversation.participants ?? []
  const participants   = agents.filter((a) => participantIds.includes(a.id))
  const available      = agents.filter((a) =>
    !participantIds.includes(a.id) && a.id !== conversation.assigned_to
  )

  function handleAdd(userId: string) {
    startTransition(async () => {
      try { await addConversationParticipant(conversation.id, userId) } catch (e) { alert((e as Error).message) }
    })
    setShowAdd(false)
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      try { await removeConversationParticipant(conversation.id, userId) } catch (e) { alert((e as Error).message) }
    })
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <UserPlus className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Participantes</span>
        </div>
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="size-5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
          >
            <Plus className="size-3" />
          </button>
        )}
      </div>

      {participants.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-1">
          {participants.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleRemove(p.id)}
              title="Remover participante"
              className="group inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <span className="size-3.5 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center">
                {p.full_name?.[0]?.toUpperCase() ?? "?"}
              </span>
              {p.full_name?.split(" ")[0] ?? "Agente"}
              <X className="size-2.5 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic">Sem participantes adicionais.</p>
      )}

      {showAdd && available.length > 0 && (
        <div className="mt-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 max-h-32 overflow-y-auto space-y-0.5">
          {available.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAdd(a.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] hover:bg-white rounded"
            >
              <div className="size-4 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-[8px] font-bold text-blue-700">{a.full_name?.[0]?.toUpperCase() ?? "?"}</span>
              </div>
              <span className="text-slate-700">{a.full_name ?? "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ContactSidebar — componente principal
// ═══════════════════════════════════════════════════════════════
export function ContactSidebar({
  conversation, contact, customer, recentOrders, financials,
  pipelines, stages, tags, tagsByContact, agents, segmentConfig,
}: Props) {
  const [, startTransition] = useTransition()
  const [showActions, setShowActions] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)

  const isMoveis = segmentConfig.segment === "moveis"

  // Adapta CustomerInfo (sidebar) → ConvertModalCustomer (modal). Campos extras
  // são acessados via index signature do `[key: string]: unknown` em CustomerInfo.
  function customerForConversionModal(): ConvertModalCustomer | null {
    if (!customer) return null
    const c = customer as Record<string, unknown>
    return {
      id:            customer.id,
      razao_social:  customer.razao_social ?? null,
      nome_fantasia: customer.nome_fantasia ?? null,
      cnpj_cpf:      customer.cnpj_cpf ?? null,
      kind:          (c.kind as "B2B" | "B2C" | null) ?? null,
      cep:           (c.cep         as string | null) ?? null,
      logradouro:    (c.logradouro  as string | null) ?? null,
      numero:        (c.numero      as string | null) ?? null,
      complemento:   (c.complemento as string | null) ?? null,
      bairro:        (c.bairro      as string | null) ?? null,
      cidade:        customer.cidade ?? null,
      estado:        customer.estado ?? null,
    }
  }

  function handleBlock() {
    if (!confirm(`${contact.is_blocked ? "Desbloquear" : "Bloquear"} este contato?`)) return
    startTransition(async () => {
      await setContactBlocked(contact.id, !contact.is_blocked)
    })
  }

  function handleArchive() {
    if (!confirm("Arquivar esta conversa? Ela será marcada como resolvida.")) return
    startTransition(async () => {
      await archiveConversation(conversation.id)
    })
  }

  function handleUnlinkCustomer() {
    if (!confirm("Desvincular este cliente do contato?")) return
    startTransition(async () => {
      await linkCustomerToContact(contact.id, null)
    })
  }

  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto shrink-0">
      {/* Header */}
      <div className="flex flex-col items-center px-4 pt-5 pb-3 border-b border-slate-100 relative">
        <button
          type="button"
          onClick={() => setShowActions((v) => !v)}
          className="absolute top-3 right-3 size-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center"
        >
          <ChevronDown className="size-4" />
        </button>

        {showActions && (
          <div className="absolute top-12 right-3 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[160px] z-10">
            <button
              type="button"
              onClick={handleArchive}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              <Archive className="size-3.5 text-slate-400" /> Arquivar conversa
            </button>
            <button
              type="button"
              onClick={handleBlock}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              <Ban className="size-3.5" />
              {contact.is_blocked ? "Desbloquear contato" : "Bloquear contato"}
            </button>
          </div>
        )}

        <div className="size-14 rounded-full bg-blue-600 flex items-center justify-center mb-2 overflow-hidden">
          {contact.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contact.profile_pic_url} alt="" className="size-14 object-cover" />
          ) : (
            <span className="text-lg font-bold text-white">
              {(contact.push_name ?? contact.phone_number)?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-900 text-center truncate max-w-full">
          {pickPrimaryName(customer, segmentConfig) ?? contact.push_name ?? formatPhoneDisplay(contact.phone_number)}
        </p>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
          {formatPhoneDisplay(contact.phone_number)}
        </p>

        {contact.is_blocked && (
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
            <Ban className="size-2.5" /> Bloqueado
          </span>
        )}
      </div>

      {/* Pipeline Card */}
      <PipelineCard conversation={conversation} pipelines={pipelines} stages={stages} />

      {/* Participants */}
      <ParticipantsCard conversation={conversation} agents={agents} />

      {/* Tags */}
      <TagsCard contactId={contact.id} tags={tags} tagsByContact={tagsByContact} />

      {/* Cliente vinculado ou link */}
      {customer ? (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-green-600" />
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                {segmentConfig.customerLabel}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/clientes/${customer.id}`}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                Abrir <ExternalLink className="size-2.5" />
              </Link>
              <button
                type="button"
                onClick={handleUnlinkCustomer}
                title="Desvincular"
                className="text-slate-300 hover:text-red-500"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {segmentConfig.customerFields.map((field) => {
              const value = readCustomerField(customer, field.key)
              if (!value && field.hideIfEmpty) return null
              if (field.primary) {
                return (
                  <div key={field.key}>
                    <p className={`text-xs font-medium text-slate-900 ${field.mono ? "font-mono" : ""}`}>
                      {value ?? "—"}
                    </p>
                  </div>
                )
              }
              const Icon = field.icon ? ICON_MAP[field.icon] : null
              return (
                <div key={field.key} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  {Icon && <Icon className="size-3 text-slate-400 shrink-0" />}
                  <span className={`truncate ${field.mono ? "font-mono text-slate-400" : ""}`}>
                    {value ?? "—"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <LinkCustomerCard contactId={contact.id} />
      )}

      {/* Mini financeiro */}
      {customer && financials && segmentConfig.showFinancial && (
        <FinancialCard
          financials={financials}
          metrics={segmentConfig.financialMetrics}
          recordLabelPlural={segmentConfig.activity.recordLabel + "s"}
        />
      )}

      {/* Atividade recente (pedidos / projetos / OS) */}
      {customer && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="size-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                {segmentConfig.activity.label}
              </span>
            </div>
            {isMoveis && (
              <button
                type="button"
                onClick={() => setShowCreateProject(true)}
                className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                title="Criar projeto a partir desta conversa"
              >
                <Plus className="size-3" /> Novo projeto
              </button>
            )}
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              Nenhum {segmentConfig.activity.recordLabel.toLowerCase()}.
            </p>
          ) : (
            <div className="space-y-0.5">
              {recentOrders.map((order) => {
                const total = order.final_total_amount ?? order.estimated_total_amount
                return (
                  <Link
                    key={order.id}
                    href={`${segmentConfig.activity.hrefPrefix}${order.id}`}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                        #{String(order.order_number).padStart(4, "0")}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-900 tabular-nums">
                      {BRL(Number(total))}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      <NotesCard contactId={contact.id} initialNotes={contact.notes} />

      {/* Modal de criar projeto a partir da conversa — só Móveis */}
      {showCreateProject && isMoveis && (
        <ConvertToProjectModal
          conversationId={conversation.id}
          contactLabel={contact.push_name || contact.phone_number || "—"}
          customer={customerForConversionModal()}
          onClose={() => setShowCreateProject(false)}
        />
      )}
    </div>
  )
}

// ─── Sub-componente: Notas ─────────────────────────────────────
function NotesCard({ contactId, initialNotes }: { contactId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "")
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  useEffect(() => { setNotes(initialNotes ?? "") }, [contactId, initialNotes])

  function handleSave() {
    startTransition(async () => {
      await setContactNotes(contactId, notes.trim() || null)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <div className="px-4 py-3 bg-slate-50 mt-auto">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3 text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Notas</span>
        </div>
        {saved && <span className="text-[9px] text-green-600 font-semibold">Salvo ✓</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleSave}
        placeholder="Anotações internas sobre este contato..."
        rows={3}
        disabled={isPending}
        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
      />
    </div>
  )
}
