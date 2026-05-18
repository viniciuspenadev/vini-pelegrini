"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateProject, deleteProject } from "@/lib/actions/projects"
import { ProjectResumoTab } from "@/components/moveis/project-resumo-tab"
import { ProjectEnvironmentsSection } from "@/components/moveis/project-environments-section"
import { ProjectDocumentsSection } from "@/components/moveis/project-documents-section"
import {
  FolderKanban, MessageSquare, Trash2, Loader2,
  Calendar, DollarSign, ClipboardList, Home, FileText,
} from "lucide-react"

interface Status {
  id:            string
  name:          string
  color:         string
  position:      number
  is_initial:    boolean
  is_won:        boolean
  is_completed:  boolean
  is_cancelled:  boolean
}

interface Vendedor {
  id:        string
  full_name: string | null
  email:     string
}

interface CustomerSummary {
  id:            string
  razao_social:  string | null
  nome_fantasia: string | null
}

interface ConversationSummary {
  id:      string
  subject: string | null
}

interface Environment {
  id:          string
  name:        string
  description: string | null
  value:       number
  position:    number
}

interface Attachment {
  id:              string
  environment_id:  string | null
  kind:            string
  file_name:       string
  file_size_bytes: number | null
  mime_type:       string | null
  storage_path:    string
  title:           string | null
  uploaded_at:     string
  profiles:        { full_name: string | null } | null
}

interface Project {
  id:                    string
  code:                  string
  name:                  string
  status_id:             string
  assigned_to:           string | null
  designer_partner:      string | null
  install_cep:           string | null
  install_logradouro:    string | null
  install_numero:        string | null
  install_complemento:   string | null
  install_bairro:        string | null
  install_cidade:        string | null
  install_estado:        string | null
  estimated_value:       number | null
  contracted_value:      number | null
  paid_value:            number
  expected_install_date: string | null
  actual_install_date:   string | null
  notes:                 string | null
  customers:             CustomerSummary | null
  chat_conversations:    ConversationSummary | null
}

interface Props {
  project:        Project
  statuses:       Status[]
  vendedores:     Vendedor[]
  environments:   Environment[]
  attachments:    Attachment[]
  isAdminOrOwner: boolean
}

type TabKey = "resumo" | "ambientes" | "documentos"

const BRL = (v: number | null | undefined) =>
  v != null ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

const DATE_SHORT = (d: string | null) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "—"

export function ProjectDetailClient({
  project, statuses, vendedores, environments, attachments, isAdminOrOwner,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<TabKey>("resumo")
  const [statusId, setStatusId] = useState(project.status_id)

  const currentStatus = statuses.find((s) => s.id === statusId) ?? null
  const generalDocs   = attachments.filter((a) => !a.environment_id)
  const customerName  = project.customers?.nome_fantasia || project.customers?.razao_social || "—"

  // Status muda → salva imediato (auto-save no header)
  function handleStatusChange(newStatusId: string) {
    if (newStatusId === statusId) return
    setStatusId(newStatusId)
    startTransition(async () => {
      try {
        await updateProject(project.id, { status_id: newStatusId })
        router.refresh()
      } catch (err: any) {
        setStatusId(project.status_id)  // rollback
        alert(err?.message ?? "Erro ao atualizar status")
      }
    })
  }

  function handleDelete() {
    if (!isAdminOrOwner) return
    if (!confirm(`Excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await deleteProject(project.id)
      } catch (err: any) {
        if (err?.message === "NEXT_REDIRECT" || String(err?.digest ?? "").startsWith("NEXT_REDIRECT")) throw err
        alert(err?.message ?? "Erro ao excluir")
      }
    })
  }

  const valueDisplay =
    project.contracted_value != null && Number(project.contracted_value) > 0
      ? { label: "Contratado", value: BRL(Number(project.contracted_value)) }
      : { label: "Estimado",   value: BRL(Number(project.estimated_value ?? 0)) }

  return (
    <div className="space-y-4">
      {/* ── HEADER STICKY ── */}
      <div className="sticky top-[57px] z-20 -mx-6 px-6 py-4 bg-blue-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

          {/* Linha 1: ícone + código + nome + ações */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FolderKanban className="size-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-mono font-semibold text-slate-500">{project.code}</span>
                {project.chat_conversations && (
                  <Link
                    href={`/marketing?conversation=${project.chat_conversations.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <MessageSquare className="size-3" /> Conversa vinculada
                  </Link>
                )}
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">{project.name}</h1>
              <p className="text-xs text-slate-500 truncate">
                Cliente:{" "}
                <Link
                  href={`/clientes/${project.customers?.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {customerName}
                </Link>
              </p>
            </div>
            {isAdminOrOwner && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="h-8 px-3 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="size-3.5" /> Excluir
              </button>
            )}
          </div>

          {/* Linha 2: status dropdown + valor + instalação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-100">
            <KpiPanel label="Status">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: currentStatus?.color ?? "#94A3B8" }} />
                <select
                  value={statusId}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={pending}
                  className="flex-1 text-sm font-bold bg-transparent border-0 focus:outline-none cursor-pointer pr-1"
                  style={{ color: currentStatus?.color ?? "#0F172A" }}
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-900 font-medium">{s.name}</option>
                  ))}
                </select>
                {pending && <Loader2 className="size-3 animate-spin text-slate-400 shrink-0" />}
              </div>
            </KpiPanel>

            <KpiPanel label={valueDisplay.label} icon={<DollarSign className="size-3.5 text-slate-400" />}>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{valueDisplay.value}</span>
            </KpiPanel>

            <KpiPanel label="Instalação prevista" icon={<Calendar className="size-3.5 text-slate-400" />}>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{DATE_SHORT(project.expected_install_date)}</span>
            </KpiPanel>
          </div>

          {/* Linha 3: tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100">
            <TabButton
              active={tab === "resumo"}
              onClick={() => setTab("resumo")}
              icon={<ClipboardList className="size-3.5" />}
            >
              Resumo
            </TabButton>
            <TabButton
              active={tab === "ambientes"}
              onClick={() => setTab("ambientes")}
              icon={<Home className="size-3.5" />}
              count={environments.length}
            >
              Ambientes
            </TabButton>
            <TabButton
              active={tab === "documentos"}
              onClick={() => setTab("documentos")}
              icon={<FileText className="size-3.5" />}
              count={generalDocs.length}
            >
              Documentos
            </TabButton>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO DA TAB ── */}
      {tab === "resumo" && (
        <ProjectResumoTab
          project={project}
          vendedores={vendedores}
          isAdminOrOwner={isAdminOrOwner}
        />
      )}

      {tab === "ambientes" && (
        <ProjectEnvironmentsSection
          projectId={project.id}
          environments={environments}
          attachments={attachments}
        />
      )}

      {tab === "documentos" && (
        <ProjectDocumentsSection
          projectId={project.id}
          attachments={generalDocs}
        />
      )}
    </div>
  )
}

function KpiPanel({
  label, icon, children,
}: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white px-5 py-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function TabButton({
  active, onClick, icon, count, children,
}: {
  active:   boolean
  onClick:  () => void
  icon?:    React.ReactNode
  count?:   number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      {icon}
      {children}
      {count != null && count > 0 && (
        <span
          className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums ${
            active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
