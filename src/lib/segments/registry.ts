import type { SegmentSidebarConfig } from "./types"

/**
 * Registry de segmentos.
 *
 * Para adicionar um novo segmento:
 *   1. Adicione uma entry aqui
 *   2. Defina os campos do customer relevantes
 *   3. Defina o bloco de atividade (orders/projects/etc)
 *   4. Defina as métricas financeiras
 *
 * O ContactSidebar e o server (marketing/page.tsx) consomem este registry.
 */

export const SEGMENT_REGISTRY: Record<string, SegmentSidebarConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // PESCADOS — B2B distribuição (default histórico)
  // ═══════════════════════════════════════════════════════════════
  pescados: {
    segment:       "pescados",
    label:         "Pescados — B2B Distribuição",
    customerKind:  "B2B",
    customerLabel: "Cliente Vinculado",
    customerEmptyState: {
      label:   "Contato sem cliente",
      cta:     "Cadastrar como cliente",
      ctaHref: "/clientes/novo",
    },
    customerFields: [
      { key: "nome_fantasia",     label: "Nome Fantasia",   primary: true,  hideIfEmpty: true },
      { key: "razao_social",      label: "Razão Social",    primary: true },
      { key: "cnpj_cpf",          label: "CNPJ",            mono: true,     icon: "file-text" },
      { key: "comprador_nome",    label: "Comprador",       icon: "user",   hideIfEmpty: true },
      { key: "email_financeiro",  label: "Email financeiro",icon: "mail",   hideIfEmpty: true },
      { key: "cidade_estado",     label: "Localização",     icon: "map-pin",hideIfEmpty: true },
    ],
    activity: {
      label:       "Últimos Pedidos",
      recordLabel: "Pedido",
      hrefPrefix:  "/pedidos/",
      sourceTable: "orders",
    },
    financialMetrics: ["ltv", "open_receivable", "overdue_receivable", "on_time_rate"],
    showPipeline:  true,
    showFinancial: true,
    navLabels: {
      ordersGroup:  "Vendas",
      orders:       "Pedidos",
      ordersDraft:  "Orçamentos",
      catalogGroup: "Catálogo",
      products:     "Produtos",
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // MÓVEIS — B2C planejados (ciclo longo, ticket alto)
  // ═══════════════════════════════════════════════════════════════
  moveis: {
    segment:       "moveis",
    label:         "Móveis Planejados — B2C",
    customerKind:  "B2C",
    customerLabel: "Cliente",
    customerEmptyState: {
      label:   "Contato sem cadastro",
      cta:     "Cadastrar cliente",
      ctaHref: "/clientes/novo",
    },
    customerFields: [
      // Para B2C, "razao_social" guarda o nome da pessoa
      { key: "razao_social",      label: "Nome",            primary: true,  icon: "user" },
      { key: "cnpj_cpf",          label: "CPF",             mono: true,     icon: "id-card" },
      { key: "telefone",          label: "Telefone",        mono: true,     icon: "phone",   hideIfEmpty: true },
      { key: "email_financeiro",  label: "Email",           icon: "mail",   hideIfEmpty: true },
      { key: "cidade_estado",     label: "Localização",     icon: "map-pin",hideIfEmpty: true },
    ],
    activity: {
      label:       "Projetos / Orçamentos",
      recordLabel: "Projeto",
      hrefPrefix:  "/pedidos/",   // até existir /projetos, reaproveita /pedidos
      sourceTable: "orders",
    },
    financialMetrics: ["ltv", "open_orders", "avg_ticket", "open_receivable"],
    showPipeline:  true,
    showFinancial: true,
    navLabels: {
      ordersGroup:  "Projetos",
      orders:       "Projetos",
      ordersDraft:  "Pré-projetos",
      catalogGroup: "Móveis",
      products:     "Móveis",
    },
  },
}

/** Default fallback caso o tenant não tenha segment válido. */
export const DEFAULT_SEGMENT_CONFIG: SegmentSidebarConfig = SEGMENT_REGISTRY.pescados

/** Pega config segura pelo slug do segmento. */
export function getSegmentConfig(segment: string | null | undefined): SegmentSidebarConfig {
  if (!segment) return DEFAULT_SEGMENT_CONFIG
  return SEGMENT_REGISTRY[segment] ?? DEFAULT_SEGMENT_CONFIG
}

/** Lista [slug, label] de todos os segmentos disponíveis — para usar em selects. */
export function listSegments(): Array<{ slug: string; label: string }> {
  return Object.values(SEGMENT_REGISTRY).map((s) => ({ slug: s.segment, label: s.label }))
}
