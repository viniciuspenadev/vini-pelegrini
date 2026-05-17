/**
 * Configuração de campos do form de Cliente por kind (B2B/PJ vs B2C/PF).
 *
 * Pra cada kind, define:
 *   - Quais seções do form mostrar
 *   - Labels específicos (Razão Social vs Nome completo)
 *   - Quais campos pedir
 *
 * Esse arquivo é UI puro — não tem dependência de banco.
 */

import type { LucideIcon } from "lucide-react"
import {
  Building2, User, Briefcase, Heart, Home, Hammer, Sparkles,
  Phone, Mail, MapPin, FileText, Hash, Truck, Receipt,
  DollarSign, CreditCard, Settings2, Clock, Globe,
} from "lucide-react"

export type CustomerKind = "B2B" | "B2C"

export interface KindMeta {
  kind:         CustomerKind
  label:        string       // "Pessoa Jurídica" / "Pessoa Física"
  shortLabel:   string       // "PJ" / "PF"
  description:  string       // texto explicativo no seletor
  icon:         LucideIcon
  color:        string       // cor do badge/seletor
}

export const KIND_OPTIONS: KindMeta[] = [
  {
    kind:        "B2B",
    label:       "Pessoa Jurídica",
    shortLabel:  "PJ",
    description: "Empresa (CNPJ). Indicado para revenda, distribuição e clientes corporativos.",
    icon:        Building2,
    color:       "#2563eb",
  },
  {
    kind:        "B2C",
    label:       "Pessoa Física",
    shortLabel:  "PF",
    description: "Consumidor final (CPF). Indicado para residencial e venda direta.",
    icon:        User,
    color:       "#16a34a",
  },
]

export function kindMeta(kind: CustomerKind | string | null | undefined): KindMeta {
  return KIND_OPTIONS.find((k) => k.kind === kind) ?? KIND_OPTIONS[0]
}

/** Labels que mudam entre PJ e PF no form. */
export interface KindLabels {
  identificationTitle: string
  identificationHint:  string
  primaryNameLabel:    string  // "Razão Social" vs "Nome completo"
  secondaryNameLabel:  string  // "Nome Fantasia" vs "Nome social/apelido"
  documentLabel:       string  // "CNPJ" vs "CPF"
  documentMask:        "cnpj-cpf"  // mask universal (auto-detecta pelo tamanho)
  contactSectionTitle: string  // "Contatos" vs "Contato"
  buyerLabel:          string  // "Comprador / Responsável" vs "Cônjuge / Co-titular"
}

export function labelsForKind(kind: CustomerKind): KindLabels {
  if (kind === "B2C") {
    return {
      identificationTitle: "Identificação",
      identificationHint:  "Dados pessoais do cliente",
      primaryNameLabel:    "Nome completo",
      secondaryNameLabel:  "Apelido / como prefere ser chamado(a)",
      documentLabel:       "CPF",
      documentMask:        "cnpj-cpf",
      contactSectionTitle: "Contato",
      buyerLabel:          "Cônjuge / Co-titular",
    }
  }
  // B2B (default)
  return {
    identificationTitle: "Identificação",
    identificationHint:  "Dados cadastrais e regime tributário",
    primaryNameLabel:    "Razão Social",
    secondaryNameLabel:  "Nome Fantasia",
    documentLabel:       "CNPJ",
    documentMask:        "cnpj-cpf",
    contactSectionTitle: "Contatos",
    buyerLabel:          "Comprador / Responsável",
  }
}

/** Quais seções do form mostrar pra cada kind. */
export interface KindSections {
  showFiscal:         boolean  // Inscrição Estadual + Regime tributário
  showLogistics:      boolean  // Rota de entrega, janela, instruções motorista
  showCommercial:     boolean  // Tabela preço, limite crédito, condições
  showInstallSite:    boolean  // Endereço da obra (separado do residencial) — só B2C móveis típico
  showCoTitular:      boolean  // Cônjuge / 2º responsável
  showProfession:     boolean  // Profissão / faixa de renda
  showDesignerPartner: boolean // Designer/arquiteto que indicou
  showLeadOrigin:     boolean  // Origem (Instagram, indicação, etc)
}

export function sectionsForKind(kind: CustomerKind): KindSections {
  if (kind === "B2C") {
    return {
      showFiscal:          false,  // PF não tem IE/regime
      showLogistics:       false,  // sem rota de entrega tradicional
      showCommercial:      true,   // ainda relevante (condição de pagamento)
      showInstallSite:     true,   // endereço da obra ≠ residencial é comum em móveis
      showCoTitular:       true,   // contrato com casal
      showProfession:      true,
      showDesignerPartner: true,
      showLeadOrigin:      true,
    }
  }
  // B2B (default)
  return {
    showFiscal:          true,
    showLogistics:       true,
    showCommercial:      true,
    showInstallSite:     false,
    showCoTitular:       false,
    showProfession:      false,
    showDesignerPartner: false,
    showLeadOrigin:      true,   // útil pra B2B também
  }
}

// ── Origens de lead pré-definidas (vai pra customers.metadata.origem) ───
export interface LeadOriginOption {
  value: string
  label: string
  icon:  LucideIcon
}

export const LEAD_ORIGINS: LeadOriginOption[] = [
  { value: "indicacao",       label: "Indicação de cliente",  icon: Heart },
  { value: "instagram",       label: "Instagram",             icon: Sparkles },
  { value: "google",          label: "Google / Busca",        icon: Globe },
  { value: "facebook_ads",    label: "Facebook/Meta Ads",     icon: Sparkles },
  { value: "site_form",       label: "Formulário do site",    icon: Globe },
  { value: "feira",           label: "Feira / Evento",        icon: Briefcase },
  { value: "showroom_walkin", label: "Showroom (passou em frente)", icon: Home },
  { value: "designer",        label: "Designer/Arquiteto parceiro", icon: Hammer },
  { value: "outros",          label: "Outros",                icon: Settings2 },
]

// ── Re-export de ícones úteis pra UI ─────────────────────────────
export {
  Building2, User, Briefcase, Heart, Home, Hammer, Sparkles,
  Phone, Mail, MapPin, FileText, Hash, Truck, Receipt,
  DollarSign, CreditCard, Settings2, Clock, Globe,
}
