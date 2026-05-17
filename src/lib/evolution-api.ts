/**
 * Evolution API v2 — Service Layer
 *
 * Wrapper tipado para comunicação com a Evolution API.
 * Cada método aceita url/key/instanceName para funcionar multi-tenant.
 */

interface EvolutionConfig {
  url:          string   // ex: "https://n8n-evolution-api.3qeebj.easypanel.host"
  apiKey:       string   // API key global
  instanceName: string   // nome da instância
}

async function evoFetch<T = unknown>(
  config: EvolutionConfig,
  path:   string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = config.url.replace(/\/$/, "")
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Evolution API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Instance Management ─────────────────────────────────────

export async function createInstance(config: EvolutionConfig) {
  return evoFetch(config, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: config.instanceName,
      integration:  "WHATSAPP-BAILEYS",
      qrcode:       true,
    }),
  })
}

export async function getInstanceStatus(config: EvolutionConfig) {
  return evoFetch<{
    instance: {
      instanceName: string
      state:        "open" | "close" | "connecting"
    }
  }>(config, `/instance/connectionState/${config.instanceName}`)
}

export async function getInstanceInfo(config: EvolutionConfig) {
  return evoFetch(config, `/instance/fetchInstances?instanceName=${config.instanceName}`)
}

export async function getQrCode(config: EvolutionConfig) {
  return evoFetch<{
    pairingCode?: string
    code?:        string
    base64?:      string
  }>(config, `/instance/connect/${config.instanceName}`)
}

export async function logoutInstance(config: EvolutionConfig) {
  return evoFetch(config, `/instance/logout/${config.instanceName}`, {
    method: "DELETE",
  })
}

export async function restartInstance(config: EvolutionConfig) {
  return evoFetch(config, `/instance/restart/${config.instanceName}`, {
    method: "PUT",
  })
}

// ── Webhooks ────────────────────────────────────────────────

export async function setWebhook(config: EvolutionConfig, webhookUrl: string) {
  return evoFetch(config, `/webhook/set/${config.instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        url:     webhookUrl,
        enabled: true,
        events:  [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
        ],
        webhookByEvents: false,
      },
    }),
  })
}

export async function getWebhook(config: EvolutionConfig) {
  return evoFetch(config, `/webhook/find/${config.instanceName}`)
}

// ── Messaging ───────────────────────────────────────────────

export async function sendTextMessage(
  config: EvolutionConfig,
  phone:  string,
  text:   string,
) {
  // Normaliza o número: remove tudo exceto dígitos, garante formato sem @
  const number = phone.replace(/\D/g, "")
  return evoFetch<{ key: { id: string } }>(
    config,
    `/message/sendText/${config.instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number,
        text,
      }),
    },
  )
}

export async function sendMediaMessage(
  config:    EvolutionConfig,
  phone:     string,
  mediaUrl:  string,
  mediaType: "image" | "audio" | "video" | "document",
  caption?:  string,
  fileName?: string,
) {
  const number = phone.replace(/\D/g, "")
  return evoFetch<{ key: { id: string } }>(
    config,
    `/message/sendMedia/${config.instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number,
        mediatype: mediaType,
        media:     mediaUrl,
        caption:   caption ?? "",
        fileName:  fileName ?? undefined,
      }),
    },
  )
}

/**
 * Baixa uma mídia (imagem/áudio/vídeo/doc) recebida via WhatsApp em base64.
 * Necessário porque as URLs do WhatsApp são criptografadas (mmg.whatsapp.net).
 */
export async function getMediaBase64(
  config: EvolutionConfig,
  msgPayload: unknown,
) {
  return evoFetch<{ base64: string; mimetype?: string; fileName?: string }>(
    config,
    `/chat/getBase64FromMediaMessage/${config.instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        message: msgPayload,
        convertToMp4: false,
      }),
    },
  )
}

// ── Contacts ────────────────────────────────────────────────

export async function fetchContacts(config: EvolutionConfig) {
  return evoFetch<Array<{
    id:         string
    pushName?:  string
    profilePictureUrl?: string
  }>>(config, `/chat/findContacts/${config.instanceName}`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function checkWhatsAppNumber(config: EvolutionConfig, phones: string[]) {
  const numbers = phones.map((p) => p.replace(/\D/g, ""))
  return evoFetch<Array<{
    exists:  boolean
    jid:     string
    number:  string
  }>>(config, `/chat/whatsappNumbers/${config.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ numbers }),
  })
}

// ── Profile Picture ─────────────────────────────────────────

/**
 * Busca a URL da foto de perfil de um número.
 * Retorna null se o usuário tem privacidade restrita ou foto não existe.
 */
export async function fetchProfilePictureUrl(
  config: EvolutionConfig,
  numberOrJid: string,
): Promise<string | null> {
  try {
    const r = await evoFetch<{ profilePictureUrl?: string | null; wuid?: string }>(
      config,
      `/chat/fetchProfilePictureUrl/${config.instanceName}`,
      {
        method: "POST",
        body: JSON.stringify({ number: numberOrJid }),
      },
    )
    return r.profilePictureUrl ?? null
  } catch {
    return null
  }
}

// ── Group Metadata ──────────────────────────────────────────

export interface GroupParticipant {
  id:           string   // JID do membro (5511...@s.whatsapp.net)
  admin?:       string | null  // "admin" | "superadmin" | null
}

export interface GroupMetadata {
  id:           string
  subject?:     string   // nome do grupo
  desc?:        string   // descrição
  pictureUrl?:  string | null
  size?:        number   // total de membros
  participants?: GroupParticipant[]
  owner?:       string
  creation?:    number   // timestamp
}

/**
 * Busca metadata de um grupo (nome, descrição, foto, lista de membros).
 * Requer que a instância seja membro do grupo.
 */
export async function fetchGroupMetadata(
  config: EvolutionConfig,
  groupJid: string,
): Promise<GroupMetadata | null> {
  try {
    return await evoFetch<GroupMetadata>(
      config,
      `/group/findGroupInfos/${config.instanceName}?groupJid=${encodeURIComponent(groupJid)}`,
    )
  } catch {
    return null
  }
}

// ── Helpers ─────────────────────────────────────────────────

/** Extrai número limpo de um WhatsApp JID */
export function jidToPhone(jid: string): string {
  return jid.split("@")[0].replace(/\D/g, "")
}

/** Converte número para JID */
export function phoneToJid(phone: string): string {
  const clean = phone.replace(/\D/g, "")
  return `${clean}@s.whatsapp.net`
}

/** Formata número para exibição: +55 (11) 99999-9999 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return `+${digits}`
}
