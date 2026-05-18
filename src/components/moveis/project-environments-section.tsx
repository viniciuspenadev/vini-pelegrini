"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createEnvironment, updateEnvironment, deleteEnvironment,
} from "@/lib/actions/project-environments"
import { uploadProjectAttachment, deleteProjectAttachment, getProjectAttachmentSignedUrl } from "@/lib/actions/project-attachments"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import {
  Plus, ChevronRight, Home, Edit2, Trash2, Save, X, Loader2,
  FileText, Image as ImageIcon, FileBox, Download, Upload, Paperclip,
} from "lucide-react"

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

interface Props {
  projectId:    string
  environments: Environment[]
  attachments:  Attachment[]
}

const BRL = (v: number | null | undefined) =>
  v != null ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

const inputBase = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

const KIND_LABEL: Record<string, string> = {
  "3d":       "Render 3D",
  photo:      "Foto",
  plant:      "Planta",
  contract:   "Contrato",
  proposal:   "Proposta",
  other:      "Outro",
}

const KIND_COLOR: Record<string, { bg: string; text: string }> = {
  "3d":     { bg: "bg-purple-50",  text: "text-purple-600" },
  photo:    { bg: "bg-amber-50",   text: "text-amber-600" },
  plant:    { bg: "bg-blue-50",    text: "text-blue-600" },
  contract: { bg: "bg-emerald-50", text: "text-emerald-600" },
  proposal: { bg: "bg-cyan-50",    text: "text-cyan-600" },
  other:    { bg: "bg-slate-100",  text: "text-slate-600" },
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ""
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function attachmentIcon(kind: string, mime: string | null) {
  if (mime?.startsWith("image/")) return <ImageIcon className="size-4" />
  if (kind === "3d" || mime === "application/pdf") return <FileBox className="size-4" />
  return <FileText className="size-4" />
}

export function ProjectEnvironmentsSection({ projectId, environments, attachments }: Props) {
  const router = useRouter()
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [editing, setEditing]         = useState<string | null>(null)
  const [showNew, setShowNew]         = useState(false)
  const [pending, startTransition]    = useTransition()

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function attachmentsOf(envId: string) {
    return attachments.filter((a) => a.environment_id === envId)
  }

  function handleDelete(env: Environment) {
    const atts = attachmentsOf(env.id).length
    const msg = atts > 0
      ? `Excluir o ambiente "${env.name}"? Os ${atts} anexo(s) virarão "documentos do projeto" (não serão apagados).`
      : `Excluir o ambiente "${env.name}"?`
    if (!confirm(msg)) return
    startTransition(async () => {
      try { await deleteEnvironment(env.id, projectId); router.refresh() }
      catch (err: any) { alert(err.message) }
    })
  }

  const totalEnvValue = environments.reduce((s, e) => s + Number(e.value ?? 0), 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Home className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ambientes</h3>
            <p className="text-[11px] text-slate-400">
              {environments.length} {environments.length === 1 ? "ambiente" : "ambientes"}
              {totalEnvValue > 0 && (
                <> · Soma: <span className="font-bold text-slate-700 tabular-nums">{BRL(totalEnvValue)}</span></>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="size-3.5" /> Ambiente
        </button>
      </div>

      {showNew && (
        <NewEnvironmentForm
          projectId={projectId}
          onClose={() => setShowNew(false)}
        />
      )}

      {environments.length === 0 && !showNew ? (
        <div className="px-8 py-12 text-center">
          <Home className="size-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700 mb-1">Nenhum ambiente ainda</p>
          <p className="text-xs text-slate-400">Crie ambientes (cozinha, closet, banheiro…) pra organizar os anexos do projeto.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {environments.map((env) => {
            const isExp = expanded.has(env.id)
            const isEdit = editing === env.id
            const atts = attachmentsOf(env.id)
            return (
              <div key={env.id}>
                {isEdit ? (
                  <EditEnvironmentForm
                    projectId={projectId}
                    environment={env}
                    onClose={() => setEditing(null)}
                  />
                ) : (
                  <div className="px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(env.id)}
                        className={`size-6 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center transition-transform shrink-0 ${isExp ? "rotate-90" : ""}`}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(env.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate">{env.name}</p>
                        {env.description && (
                          <p className="text-[11px] text-slate-500 truncate">{env.description}</p>
                        )}
                      </button>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {atts.length} {atts.length === 1 ? "anexo" : "anexos"}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0 w-24 text-right">
                        {BRL(env.value)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditing(env.id)}
                          className="size-6 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                          title="Editar"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(env)}
                          disabled={pending}
                          className="size-6 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                          title="Excluir"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isExp && !isEdit && (
                  <div className="px-5 pb-4 pl-14 bg-slate-50/40">
                    <AttachmentsList
                      attachments={atts}
                      projectId={projectId}
                      environmentId={env.id}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Form: novo ambiente ────────────────────────────────────────
function NewEnvironmentForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) return
    const value = parseFloat(String(fd.get("value") ?? "0"))

    startTransition(async () => {
      try {
        await createEnvironment(projectId, {
          name,
          description: String(fd.get("description") ?? "").trim() || null,
          value: isNaN(value) ? 0 : value,
        })
        onClose()
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 bg-blue-50/40 border-b border-blue-100">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_200px_auto] gap-3 items-end">
        <InputField label="Nome" name="name" required placeholder='Ex: "Cozinha"' autoFocus />
        <InputField label="Descrição" name="description" placeholder="Detalhes (opcional)" />
        <MaskedInput
          mask="currency"
          label="Valor"
          name="value"
          prefix="R$"
          defaultValue={0}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-3 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-1.5"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Criar
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Form: editar ambiente (inline) ─────────────────────────────
function EditEnvironmentForm({
  projectId, environment, onClose,
}: { projectId: string; environment: Environment; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) return
    const value = parseFloat(String(fd.get("value") ?? "0"))

    startTransition(async () => {
      try {
        await updateEnvironment(environment.id, projectId, {
          name,
          description: String(fd.get("description") ?? "").trim() || null,
          value: isNaN(value) ? 0 : value,
        })
        onClose()
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 bg-blue-50/40">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_200px_auto] gap-3 items-end">
        <InputField label="Nome" name="name" required defaultValue={environment.name} autoFocus />
        <InputField label="Descrição" name="description" defaultValue={environment.description ?? ""} />
        <MaskedInput
          mask="currency"
          label="Valor"
          name="value"
          prefix="R$"
          defaultValue={environment.value ?? 0}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-3 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
          >
            <X className="size-3.5" />
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-1.5"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Lista de anexos de um ambiente (ou geral) ──────────────────
export function AttachmentsList({
  attachments, projectId, environmentId,
}: {
  attachments:   Attachment[]
  projectId:     string
  environmentId: string | null  // null = anexo geral do projeto
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading]  = useState(false)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const kind = guessKindFromFile(file)
    const fd = new FormData()
    fd.set("file", file)
    fd.set("kind", kind)
    if (environmentId) fd.set("environment_id", environmentId)

    setUploading(true)
    startTransition(async () => {
      try {
        await uploadProjectAttachment(projectId, fd)
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      } finally {
        setUploading(false)
        e.target.value = ""
      }
    })
  }

  function handleDownload(att: Attachment) {
    startTransition(async () => {
      try {
        const url = await getProjectAttachmentSignedUrl(att.storage_path)
        window.open(url, "_blank")
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  function handleDelete(att: Attachment) {
    if (!confirm(`Excluir "${att.file_name}"?`)) return
    startTransition(async () => {
      try {
        await deleteProjectAttachment(att.id, projectId)
        router.refresh()
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <div className="space-y-1">
      {attachments.length === 0 && (
        <p className="text-[11px] text-slate-400 italic py-2">Nenhum anexo. Faça upload abaixo.</p>
      )}
      {attachments.map((a) => {
        const kindMeta = KIND_COLOR[a.kind] ?? KIND_COLOR.other
        return (
          <div
            key={a.id}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div className={`size-7 rounded-md ${kindMeta.bg} ${kindMeta.text} flex items-center justify-center shrink-0`}>
              {attachmentIcon(a.kind, a.mime_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {a.title || a.file_name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                <span className="font-semibold">{KIND_LABEL[a.kind] ?? a.kind}</span>
                {a.file_size_bytes && <span> · {formatSize(a.file_size_bytes)}</span>}
                {a.profiles?.full_name && <span> · {a.profiles.full_name}</span>}
                <span> · {new Date(a.uploaded_at).toLocaleDateString("pt-BR")}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(a)}
              disabled={pending}
              className="size-7 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center"
              title="Baixar"
            >
              <Download className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(a)}
              disabled={pending}
              className="size-7 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Excluir"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )
      })}

      <label className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors text-xs font-semibold text-slate-500 hover:text-blue-600">
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {uploading ? "Enviando..." : "Anexar arquivo"}
        <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  )
}

// Heurística simples pra adivinhar `kind` pelo arquivo
function guessKindFromFile(file: File): string {
  const name = file.name.toLowerCase()
  if (file.type.startsWith("image/")) return "photo"
  if (file.type === "application/pdf") {
    if (name.includes("3d") || name.includes("render")) return "3d"
    if (name.includes("planta")) return "plant"
    if (name.includes("contrato")) return "contract"
    if (name.includes("proposta") || name.includes("orcamento")) return "proposal"
  }
  return "other"
}
