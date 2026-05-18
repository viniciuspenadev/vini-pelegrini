"use client"

import { AttachmentsList } from "@/components/moveis/project-environments-section"
import { FileText } from "lucide-react"

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
  projectId:   string
  attachments: Attachment[]  // já filtrados (environment_id === null)
}

/**
 * Anexos "soltos" do projeto: contrato, proposta, foto da fachada,
 * documentos gerais que não pertencem a nenhum ambiente.
 */
export function ProjectDocumentsSection({ projectId, attachments }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <FileText className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Documentos do projeto</h3>
          <p className="text-[11px] text-slate-400">
            Contrato, proposta, foto da fachada e outros documentos que não pertencem a um ambiente específico.
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <AttachmentsList
          projectId={projectId}
          environmentId={null}
          attachments={attachments}
        />
      </div>
    </div>
  )
}
