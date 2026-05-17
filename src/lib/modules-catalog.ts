/**
 * Catálogo de módulos da plataforma — puro (sem dependências de banco).
 *
 * Usado em:
 *   - /god/tenants/[id] para gerenciar overrides do tenant
 *   - /god/planos/* para definir módulos do plano
 *
 * `segment`: se preenchido, módulo só faz sentido para este segmento.
 * Módulos sem `segment` são universais (Core, Marketing, Financeiro, Fiscal).
 */
export const ALL_MODULES = [
  { key: "core.crm",              label: "CRM de Clientes",        group: "Core" },
  { key: "core.usuarios",         label: "Gestão de Usuários",     group: "Core" },
  { key: "core.dashboard",        label: "Dashboard & Relatórios", group: "Core" },
  { key: "marketing.inbox",       label: "Inbox WhatsApp",         group: "Marketing" },
  { key: "marketing.pipeline",    label: "Pipeline / Kanban",      group: "Marketing" },
  { key: "marketing.contatos",    label: "Contatos",               group: "Marketing" },
  { key: "marketing.relatorios",  label: "Relatórios",             group: "Marketing" },
  { key: "marketing.campanhas",   label: "Campanhas",              group: "Marketing", comingSoon: true },
  { key: "pescados.pedidos",      label: "Pedidos",                group: "Pescados",   segment: "pescados" },
  { key: "pescados.produtos",     label: "Produtos",               group: "Pescados",   segment: "pescados" },
  { key: "pescados.separacao",    label: "Separação Física",       group: "Pescados",   segment: "pescados" },
  { key: "pescados.rotas",        label: "Rotas de Entrega",       group: "Pescados",   segment: "pescados" },
  { key: "moveis.projetos",       label: "Projetos",               group: "Móveis",     segment: "moveis", comingSoon: true },
  { key: "moveis.produtos",       label: "Produtos",               group: "Móveis",     segment: "moveis", comingSoon: true },
  { key: "moveis.orcamentos",     label: "Orçamentos",             group: "Móveis",     segment: "moveis", comingSoon: true },
  { key: "moveis.instalacoes",    label: "Instalações",            group: "Móveis",     segment: "moveis", comingSoon: true },
  { key: "fiscal.nfe",            label: "Emissão de NF-e",        group: "Fiscal" },
  { key: "fiscal.config",         label: "Config. Tributária",     group: "Fiscal" },
  { key: "financeiro.receber",    label: "Contas a Receber",       group: "Financeiro" },
  { key: "financeiro.pagamentos", label: "Pagamentos",             group: "Financeiro" },
] as const

export type ModuleCatalogEntry = (typeof ALL_MODULES)[number]

/**
 * Lookup helpers — usados ao criar tenant pra montar a lista correta de módulos.
 */
const MODULE_BY_KEY: Record<string, ModuleCatalogEntry> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m])
) as Record<string, ModuleCatalogEntry>

/**
 * Filtra uma lista de módulos para REMOVER os que pertencem a outros segmentos.
 *
 * Ex: filterBySegment(["core.crm", "pescados.pedidos", "moveis.projetos"], "moveis")
 *  →  ["core.crm", "moveis.projetos"]
 */
export function filterModulesBySegment(modules: string[], segment: string): string[] {
  return modules.filter((key) => {
    const meta = MODULE_BY_KEY[key]
    if (!meta) return true                   // chaves desconhecidas passam (universal por default)
    const m = meta as ModuleCatalogEntry & { segment?: string }
    return !m.segment || m.segment === segment
  })
}

/**
 * Retorna o conjunto mínimo de módulos que um tenant deve ter para o segmento informado.
 * Inclui core + marketing + financeiro + módulos do segmento.
 */
export function getDefaultModulesForSegment(segment: string): string[] {
  return ALL_MODULES
    .filter((m) => {
      const meta = m as ModuleCatalogEntry & { segment?: string; comingSoon?: boolean }
      // Exclui comingSoon — tenant não nasce com módulo sem código implementado
      if (meta.comingSoon) return false
      return !meta.segment || meta.segment === segment
    })
    .map((m) => m.key)
}
