"use client"

import { useState, useTransition, useRef } from "react"
import {
  Paperclip, Upload, X, Loader2, Download, File, Image as ImageIcon,
  FileText, Receipt, Camera, ScrollText, Tag,
} from "lucide-react"
import { uploadOrderAttachment, deleteOrderAttachment, getAttachmentSignedUrl } from "@/lib/actions/order-attachments"

interface Attachment {
  id:              string
  file_name:       string
  file_size_bytes: number | null
  mime_type:       string | null
  storage_path:    string
  category:        string
  description:     string | null
  uploaded_at:     string
}

interface Props {
  orderId:     string
  attachments: Attachment[]
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pedido:      { label: "Pedido",       icon: ScrollText,  color: "bg-blue-50 text-blue-600 border-blue-100" },
  nfe:         { label: "NF-e",         icon: Receipt,     color: "bg-violet-50 text-violet-600 border-violet-100" },
  comprovante: { label: "Comprovante",  icon: FileText,    color: "bg-green-50 text-green-600 border-green-100" },
  foto:        { label: "Foto",         icon: Camera,      color: "bg-amber-50 text-amber-600 border-amber-100" },
  contrato:    { label: "Contrato",     icon: FileText,    color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
  outros:      { label: "Outros",       icon: File,        color: "bg-slate-100 text-slate-500 border-slate-200" },
}

const DATE_SHORT = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith("image/")) return ImageIcon
  if (mime === "application/pdf") return FileText
  return File
}

const inputBase = "h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

export function OrderAttachments({ orderId, attachments }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await uploadOrderAttachment(orderId, fd)
        setFileName(null)
        setShowForm(false)
        formRef.current?.reset()
      } catch (err: any) {
        alert(err.message ?? "Erro ao enviar arquivo")
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este anexo permanentemente?")) return
    startTransition(async () => {
      await deleteOrderAttachment(id, orderId)
    })
  }

  async function handleDownload(storagePath: string, fileName: string) {
    try {
      const url = await getAttachmentSignedUrl(storagePath)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      alert(err.message ?? "Erro ao baixar")
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
          <Paperclip className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Documentos</p>
        {attachments.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-400 tabular-nums">{attachments.length}</span>
        )}
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto size-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
        >
          {showForm ? <X className="size-3.5" /> : <Upload className="size-3.5" />}
        </button>
      </div>

      <div className="p-3 space-y-1.5">

        {/* Form de upload */}
        {showForm && (
          <form ref={formRef} onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors px-3 py-2.5">
              <Upload className="size-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 flex-1 truncate">
                {fileName ?? "Selecionar arquivo (até 20MB)"}
              </span>
              <input
                type="file"
                name="file"
                required
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,text/plain,text/csv,application/zip"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="sr-only"
                disabled={pending}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Categoria</span>
                <select name="category" className={inputBase} defaultValue="outros" disabled={pending}>
                  <option value="pedido">Pedido</option>
                  <option value="nfe">NF-e</option>
                  <option value="comprovante">Comprovante</option>
                  <option value="foto">Foto</option>
                  <option value="contrato">Contrato</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Descrição (opcional)</span>
                <input
                  name="description"
                  type="text"
                  className={inputBase}
                  placeholder="Ex: Foto da entrega"
                  disabled={pending}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFileName(null) }}
                disabled={pending}
                className="h-7 px-3 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !fileName}
                className="h-7 px-3 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-60 flex items-center gap-1"
              >
                {pending && <Loader2 className="size-3 animate-spin" />}
                Enviar
              </button>
            </div>
          </form>
        )}

        {/* Lista */}
        {attachments.length === 0 && !showForm ? (
          <div className="px-2 py-6 text-center">
            <Paperclip className="size-5 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Sem anexos. Adicione NF, comprovantes, fotos.</p>
          </div>
        ) : (
          attachments.map((a) => {
            const cat  = CATEGORY_META[a.category] ?? CATEGORY_META.outros
            const Icon = fileIcon(a.mime_type)
            return (
              <div
                key={a.id}
                className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className={`inline-flex items-center justify-center size-8 rounded-lg border ${cat.color} shrink-0`}>
                  <Icon className="size-3.5" />
                </span>

                <button
                  type="button"
                  onClick={() => handleDownload(a.storage_path, a.file_name)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-700 transition-colors">{a.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Tag className="size-2.5" />{cat.label}
                    </span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400">{formatBytes(a.file_size_bytes)}</span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400">{DATE_SHORT(a.uploaded_at)}</span>
                  </div>
                  {a.description && (
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate italic">{a.description}</p>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(a.storage_path, a.file_name)}
                  title="Baixar"
                  className="shrink-0 size-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                >
                  <Download className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={pending}
                  title="Remover"
                  className="shrink-0 size-5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
