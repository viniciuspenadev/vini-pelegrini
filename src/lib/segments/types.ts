/**
 * Configuração de segmento — define como cada vertical (pescados, móveis, etc)
 * renderiza o ContactSidebar do Inbox e quais queries servidas pelo server.
 *
 * Princípio: o ContactSidebar é AGNÓSTICO de segmento — ele recebe uma
 * SegmentSidebarConfig (plain JSON) e renderiza os blocos descritos por ela.
 *
 * IMPORTANTE: este objeto trafega Server → Client, então só pode conter
 * tipos serializáveis (strings, numbers, booleans, arrays, objects). Nada de
 * funções ou componentes React — usar nomes de ícones (string) que o client
 * resolve via mapa.
 */

/** Chaves de ícones suportados (resolvidos no client via mapa). */
export type IconName =
  | "user" | "users" | "mail" | "map-pin" | "phone" | "file-text" | "id-card"
  | "building" | "shopping-cart" | "credit-card"

/** Chaves de métricas financeiras pré-definidas. */
export type FinancialMetricKey =
  | "ltv"                  // Total transacionado (clientes encerrados)
  | "open_orders"          // Quantidade de pedidos/projetos em andamento
  | "open_receivable"      // Saldo em aberto a receber
  | "overdue_receivable"   // Saldo vencido
  | "on_time_rate"         // % pagamentos pontuais
  | "avg_ticket"           // Ticket médio
  | "mrr"                  // Receita recorrente (SaaS)

/** Tipo de cliente principal do segmento. */
export type CustomerKind = "B2B" | "B2C" | "B2B_B2C"

/** Configuração de um campo a exibir do customer. */
export interface CustomerFieldConfig {
  key:    string         // Coluna do customer (ex: "razao_social", "cnpj_cpf")
  label:  string         // Label visível (ex: "Razão Social")
  icon?:  IconName
  mono?:  boolean        // Renderiza com fonte mono (CNPJ, CPF, codigo)
  hideIfEmpty?: boolean  // Não mostra se valor for null/vazio
  primary?: boolean      // Campo "principal" — vira o nome em destaque no topo
}

/** Configuração do bloco de atividade recente (pedidos, projetos, etc). */
export interface ActivityBlockConfig {
  label:       string           // "Últimos Pedidos" / "Projetos" / "Ordens de Serviço"
  recordLabel: string           // "Pedido" / "Projeto" / "OS" (singular)
  hrefPrefix:  string           // Prefixo de URL (ex: "/pedidos/") — id é appended no client
  sourceTable: "orders" | "projects"   // Tabela a consultar; controla a query no server
}

/** Labels que mudam por segmento no sidebar/navegação. */
export interface SegmentNavLabels {
  ordersGroup:    string  // "Vendas" / "Projetos"
  orders:         string  // "Pedidos" / "Projetos"
  ordersDraft:    string  // "Orçamentos" / "Pré-projetos"
  catalogGroup:   string  // "Catálogo" / "Móveis"
  products:       string  // "Produtos" / "Móveis"
}

/** Configuração completa de um segmento para o ContactSidebar. */
export interface SegmentSidebarConfig {
  segment:           string
  label:             string             // "Pescados — B2B Distribuição"
  customerKind:      CustomerKind
  customerLabel:     string             // "Cliente B2B" / "Cliente PF"
  customerFields:    CustomerFieldConfig[]   // Campos a renderizar no card
  customerEmptyState: {
    label:    string  // "Contato sem cliente"
    cta:      string  // "Cadastrar como cliente"
    ctaHref:  string  // /clientes/novo?tipo=pj
  }
  activity:          ActivityBlockConfig
  financialMetrics:  FinancialMetricKey[]
  showPipeline:      boolean   // alguns segmentos podem não usar pipeline (raro)
  showFinancial:     boolean   // SaaS pode ter outras métricas
  navLabels:         SegmentNavLabels  // Labels do menu lateral
}
