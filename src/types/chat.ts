// ═══════════════════════════════════════════════════════════════
// Chat Module — Types
// ═══════════════════════════════════════════════════════════════

export type WhatsAppInstanceStatus = "disconnected" | "connecting" | "connected" | "qr_pending"
export type ConversationStatus     = "open" | "pending" | "resolved" | "snoozed"
export type ConversationPriority   = "low" | "normal" | "high" | "urgent"
export type MessageSenderType      = "contact" | "agent" | "system" | "bot"
export type MessageContentType     = "text" | "image" | "audio" | "video" | "document" | "location" | "sticker" | "reaction"
export type MessageDeliveryStatus  = "pending" | "sent" | "delivered" | "read" | "failed"

export interface WhatsAppInstance {
  id:                  string
  tenant_id:           string
  instance_name:       string
  instance_token:      string | null
  phone_number:        string | null
  status:              WhatsAppInstanceStatus
  evolution_url:       string
  evolution_key:       string
  webhook_url:         string | null
  settings:            Record<string, unknown>
  // Health / heartbeat
  last_heartbeat_at:   string | null
  reconnect_attempts:  number
  user_disconnected:   boolean
  last_error:          string | null
  created_at:          string
  updated_at:          string
}

export type LifecycleStage =
  | "contact"
  | "lead"
  | "customer"
  | "active_customer"
  | "inactive_customer"
  | "unfit"

export type ContactSource =
  | "whatsapp_inbound"
  | "whatsapp_outbound"
  | "manual"
  | "import"
  | "instagram"
  | "webform"

export interface ChatContact {
  id:                   string
  tenant_id:            string
  customer_id:          string | null
  whatsapp_id:          string
  phone_number:         string
  push_name:            string | null
  profile_pic_url:      string | null
  is_blocked:           boolean
  tags:                 string[]
  notes:                string | null
  source:               ContactSource
  lifecycle_stage:      LifecycleStage
  lifecycle_changed_at: string | null
  qualified_at:         string | null
  qualified_by:         string | null
  unfit_reason:         string | null
  last_order_at:        string | null
  created_at:           string
  updated_at:           string
  // Joined
  customers?: {
    razao_social:  string
    nome_fantasia: string | null
  } | null
}

export interface ChatConversation {
  id:                    string
  tenant_id:             string
  contact_id:            string | null   // null em conversas de grupo
  instance_id:           string
  assigned_to:           string | null
  status:                ConversationStatus
  priority:              ConversationPriority
  channel:               string
  subject:               string | null
  last_message_at:       string | null
  last_message_preview:  string | null
  unread_count:          number
  tags:                  string[]
  metadata:              Record<string, unknown>
  // Pipeline fields
  pipeline_id:           string | null
  stage_id:              string | null
  card_position:         number
  estimated_value:       number | null
  expected_close_date:   string | null
  lost_reason:           string | null
  won_at:                string | null
  lost_at:               string | null
  participants:          string[]
  // Grupos WhatsApp
  is_group:              boolean
  group_jid:             string | null
  group_name:            string | null
  group_picture:         string | null
  group_members:         Array<{ jid: string; name?: string }>

  created_at:            string
  updated_at:            string
  // Joined
  chat_contacts?: ChatContact
  profiles?:      { full_name: string | null } | null
  pipeline_stages?: { id: string; name: string; color: string; is_won: boolean; is_lost: boolean } | null
}

export interface ChatMessage {
  id:              string
  conversation_id: string
  tenant_id:       string
  sender_type:     MessageSenderType
  sender_id:       string | null
  content_type:    MessageContentType
  content:         string | null
  media_url:       string | null
  media_mime_type: string | null
  media_file_name: string | null
  whatsapp_msg_id: string | null
  reply_to_id:     string | null
  status:          MessageDeliveryStatus
  is_private_note: boolean
  metadata:        Record<string, unknown>
  group_participant_jid: string | null
  created_at:      string
  // Joined
  profiles?:       { full_name: string | null } | null
}

export interface ChatQuickReply {
  id:         string
  tenant_id:  string
  shortcut:   string
  title:      string
  content:    string
  created_by: string | null
  created_at: string
}

// ═══════════════════════════════════════════════════════════════
// Evolution API — Webhook Payload Types
// ═══════════════════════════════════════════════════════════════

export interface EvolutionWebhookPayload {
  event:    string
  instance: string
  data:     Record<string, unknown>
}

export interface EvolutionMessageData {
  key: {
    remoteJid:  string
    fromMe:     boolean
    id:         string
  }
  pushName?:    string
  message?: {
    conversation?:          string
    extendedTextMessage?:   { text: string }
    imageMessage?:          { caption?: string; mimetype?: string; url?: string }
    audioMessage?:          { mimetype?: string; url?: string }
    videoMessage?:          { caption?: string; mimetype?: string; url?: string }
    documentMessage?:       { fileName?: string; mimetype?: string; url?: string; caption?: string }
    stickerMessage?:        { mimetype?: string }
    locationMessage?:       { degreesLatitude: number; degreesLongitude: number }
    reactionMessage?:       { text: string; key: { id: string } }
  }
  messageType?:  string
  messageTimestamp?: number
  status?:       string // "DELIVERY_ACK" | "READ" | "PLAYED"
}

export interface EvolutionConnectionData {
  state:   "open" | "close" | "connecting"
  statusReason?: number
}

export interface EvolutionQrCodeData {
  pairingCode?: string
  code?:        string
  base64?:      string
}
