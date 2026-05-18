/**
 * Templates de statuses de Projetos por segmento.
 * Aplicados uma vez por tenant no bootstrap.
 *
 * Cada status tem flags semânticas que o código consulta —
 * NUNCA compare por `name`, sempre por `is_initial`/`is_won`/etc.
 * Assim o tenant pode renomear livremente sem quebrar nada.
 */

export interface ProjectStatusTemplate {
  name:          string
  color:         string
  is_initial?:   boolean
  is_won?:       boolean
  is_completed?: boolean
  is_cancelled?: boolean
}

// ── Móveis Planejados ───────────────────────────────────────────
// Statuses de EXECUÇÃO. Projeto nasce na medição (após conversão
// do lead no pipeline do chat). Pipeline de chat = atendimento;
// project statuses = execução. As duas coisas são separadas.
const MOVEIS: ProjectStatusTemplate[] = [
  { name: "Em medição",          color: "#0EA5E9", is_initial: true },
  { name: "3D em desenvolvimento", color: "#8B5CF6" },
  { name: "3D aprovado",         color: "#A855F7" },
  { name: "Contrato assinado",   color: "#F59E0B", is_won: true },   // dispara accounts_receivable
  { name: "Sinal pago",          color: "#EAB308" },
  { name: "Em produção",         color: "#84CC16" },
  { name: "Pronto p/ entrega",   color: "#22C55E" },
  { name: "Instalado",           color: "#10B981", is_completed: true },
  { name: "Cancelado",           color: "#EF4444", is_cancelled: true },
]

// ── Genérico (qualquer outro segmento que use projects no futuro) ─
const GENERIC: ProjectStatusTemplate[] = [
  { name: "Novo",       color: "#94A3B8", is_initial: true   },
  { name: "Em andamento", color: "#3B82F6" },
  { name: "Concluído",  color: "#10B981", is_won: true, is_completed: true },
  { name: "Cancelado",  color: "#EF4444", is_cancelled: true },
]

const TEMPLATES: Record<string, ProjectStatusTemplate[]> = {
  moveis:  MOVEIS,
  generic: GENERIC,
}

export function getProjectStatusesTemplate(segment: string | null): ProjectStatusTemplate[] {
  if (!segment) return GENERIC
  return TEMPLATES[segment] ?? GENERIC
}
