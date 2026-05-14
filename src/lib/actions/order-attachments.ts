"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const BUCKET = "order-attachments"

export async function uploadOrderAttachment(orderId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) throw new Error("Nenhum arquivo enviado")

  const category    = (formData.get("category") as string) || "outros"
  const description = (formData.get("description") as string) || null

  // Path no bucket: tenant_id/order_id/timestamp_filename
  const safeName    = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const storagePath = `${session.user.tenantId}/${orderId}/${Date.now()}_${safeName}`

  // Upload pra Storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert:      false,
    })
  if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`)

  // Registro na tabela
  const { error: dbErr } = await supabaseAdmin.from("order_attachments").insert({
    order_id:        orderId,
    tenant_id:       session.user.tenantId,
    file_name:       file.name,
    file_size_bytes: file.size,
    mime_type:       file.type || null,
    storage_path:    storagePath,
    category,
    description,
    uploaded_by:     session.user.id,
  })

  if (dbErr) {
    // Rollback: remove o arquivo do storage
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
    throw new Error(dbErr.message)
  }

  revalidatePath(`/pedidos/${orderId}`)
}

export async function deleteOrderAttachment(attachmentId: string, orderId: string) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")

  // Busca o storage_path
  const { data: att } = await supabaseAdmin
    .from("order_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!att) throw new Error("Anexo não encontrado")

  // Remove do Storage
  await supabaseAdmin.storage.from(BUCKET).remove([att.storage_path])

  // Remove do banco
  await supabaseAdmin
    .from("order_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath(`/pedidos/${orderId}`)
}

/** Gera URL assinada de download (válida por 5 min) */
export async function getAttachmentSignedUrl(storagePath: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")

  // Garante que o caminho começa com o tenant_id (defesa em profundidade)
  if (!storagePath.startsWith(`${session.user.tenantId}/`)) {
    throw new Error("Acesso negado")
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300)  // 5 minutos

  if (error || !data) throw new Error(error?.message ?? "Erro ao gerar URL")
  return data.signedUrl
}
