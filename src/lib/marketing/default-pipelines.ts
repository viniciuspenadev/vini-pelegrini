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
  show_in_kanban?: boolean   // se omitido: triage=false, demais=true
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
// Pipeline curto de ATENDIMENTO/CONVERSÃO no chat. Foco: "esse lead
// vai virar projeto?". A execução real (medição → 3D → contrato →
// produção → instalação) vive em `projects` com seus próprios
// statuses (`project_statuses`).
//
// Quando o vendedor arrasta a conversa para o estágio "Convertido"
// (is_won), o sistema cria automaticamente um projeto vinculado.
// Tenant pode customizar livremente em /marketing/pipeline/configuracao.
const MOVEIS: PipelineTemplate = {
  name:        "Atendimento Móveis",
  description: "Funil de atendimento e conversão — da captação ao projeto",
  color:       "#92400E",
  stages: [
    { name: "Triagem",              color: "#94A3B8", probability_pct: 0,   is_triage: true },
    { name: "Lead novo",            color: "#3B82F6", probability_pct: 10 },
    { name: "Showroom agendado",    color: "#06B6D4", probability_pct: 30 },
    { name: "Pós-visita",           color: "#0EA5E9", probability_pct: 50 },
    { name: "Convertido em projeto", color: "#10B981", probability_pct: 100, is_won: true  },
    { name: "Perdido",              color: "#EF4444", probability_pct: 0,   is_lost: true },
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
