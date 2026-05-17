/**
 * Templates de funis pré-configurados por segmento.
 * Aplicados uma vez por tenant — no primeiro acesso ao módulo Pipeline.
 *
 * Cada segmento traz 1 pipeline padrão com stages típicos da indústria.
 * Tenant pode editar tudo depois (renomear, adicionar, remover, criar outros funis).
 */

export interface StageTemplate {
  name:            string
  color:           string
  probability_pct: number
  is_won?:         boolean
  is_lost?:        boolean
  is_triage?:      boolean
}

export interface PipelineTemplate {
  name:        string
  description: string
  color:       string
  stages:      StageTemplate[]
}

// ── Universal (genérico para qualquer segmento) ─────────────────
const GENERIC: PipelineTemplate = {
  name:        "Vendas",
  description: "Pipeline padrão de vendas",
  color:       "#3B82F6",
  stages: [
    { name: "Lead novo",            color: "#94A3B8", probability_pct: 5   },
    { name: "Qualificado",          color: "#3B82F6", probability_pct: 20  },
    { name: "Proposta enviada",     color: "#8B5CF6", probability_pct: 50  },
    { name: "Negociação",           color: "#F59E0B", probability_pct: 75  },
    { name: "Ganho",                color: "#10B981", probability_pct: 100, is_won: true  },
    { name: "Perdido",              color: "#EF4444", probability_pct: 0,   is_lost: true },
  ],
}

// ── Pescados (B2B distribuição) ─────────────────────────────────
const PESCADOS: PipelineTemplate = {
  name:        "Vendas Pescados",
  description: "Funil para distribuição B2B de pescados",
  color:       "#0891B2",
  stages: [
    { name: "Triagem",              color: "#94A3B8", probability_pct: 0,   is_triage: true },
    { name: "Cotação solicitada",   color: "#3B82F6", probability_pct: 15  },
    { name: "Amostra enviada",      color: "#06B6D4", probability_pct: 30  },
    { name: "Proposta",             color: "#8B5CF6", probability_pct: 50  },
    { name: "Negociação preço",     color: "#F59E0B", probability_pct: 70  },
    { name: "1º pedido confirmado", color: "#10B981", probability_pct: 100, is_won: true  },
    { name: "Perdido",              color: "#EF4444", probability_pct: 0,   is_lost: true },
  ],
}

// ── Móveis planejados ───────────────────────────────────────────
// Funil real do mercado: 12 estágios, do primeiro contato à instalação.
// Pode ser editado/customizado depois pelo tenant em /marketing/pipeline/configuracao.
const MOVEIS: PipelineTemplate = {
  name:        "Vendas Móveis Planejados",
  description: "Funil completo — da captação à instalação final",
  color:       "#92400E",
  stages: [
    { name: "Triagem",               color: "#94A3B8", probability_pct: 0,   is_triage: true },
    { name: "Showroom agendado",     color: "#3B82F6", probability_pct: 15 },
    { name: "Pós-visita",            color: "#06B6D4", probability_pct: 25 },
    { name: "Em medição",            color: "#0EA5E9", probability_pct: 35 },
    { name: "3D em desenvolvimento", color: "#8B5CF6", probability_pct: 45 },
    { name: "3D aprovado",           color: "#A855F7", probability_pct: 60 },
    { name: "Contrato assinado",     color: "#F59E0B", probability_pct: 75 },
    { name: "Sinal pago",            color: "#EAB308", probability_pct: 85 },
    { name: "Em produção",           color: "#84CC16", probability_pct: 95 },
    { name: "Pronto p/ entrega",     color: "#22C55E", probability_pct: 98 },
    { name: "Instalado",             color: "#10B981", probability_pct: 100, is_won: true  },
    { name: "Perdido",               color: "#EF4444", probability_pct: 0,   is_lost: true },
  ],
}

// ── SaaS / Serviços recorrentes ─────────────────────────────────
const SAAS: PipelineTemplate = {
  name:        "Vendas SaaS",
  description: "Funil para serviços recorrentes / assinaturas",
  color:       "#7C3AED",
  stages: [
    { name: "MQL",                  color: "#94A3B8", probability_pct: 5   },
    { name: "SQL (qualificado)",    color: "#3B82F6", probability_pct: 20  },
    { name: "Demonstração",         color: "#06B6D4", probability_pct: 40  },
    { name: "Trial",                color: "#8B5CF6", probability_pct: 60  },
    { name: "Proposta comercial",   color: "#F59E0B", probability_pct: 80  },
    { name: "Cliente ativo",        color: "#10B981", probability_pct: 100, is_won: true  },
    { name: "Churn / Perdido",      color: "#EF4444", probability_pct: 0,   is_lost: true },
  ],
}

// ── Auto-peças / Concessionária (template extra) ────────────────
const AUTO: PipelineTemplate = {
  name:        "Vendas Auto",
  description: "Funil para concessionária / auto-peças",
  color:       "#DC2626",
  stages: [
    { name: "Interesse",            color: "#94A3B8", probability_pct: 10  },
    { name: "Test drive",           color: "#3B82F6", probability_pct: 30  },
    { name: "Avaliação de troca",   color: "#06B6D4", probability_pct: 50  },
    { name: "Negociação",           color: "#F59E0B", probability_pct: 75  },
    { name: "Vendido",              color: "#10B981", probability_pct: 100, is_won: true  },
    { name: "Perdido",              color: "#EF4444", probability_pct: 0,   is_lost: true },
  ],
}

const TEMPLATES: Record<string, PipelineTemplate> = {
  pescados:  PESCADOS,
  moveis:    MOVEIS,
  saas:      SAAS,
  servicos:  SAAS,
  auto:      AUTO,
  generic:   GENERIC,
}

export function getPipelineTemplate(segment: string | null): PipelineTemplate {
  if (!segment) return GENERIC
  return TEMPLATES[segment] ?? GENERIC
}
