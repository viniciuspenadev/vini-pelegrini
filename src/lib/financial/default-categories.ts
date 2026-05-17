/**
 * Templates de plano de contas por segmento.
 * Aplicado uma vez por tenant — no primeiro acesso ao módulo Financeiro.
 *
 * Estrutura: cada nó tem `children` opcional (hierarquia)
 * Categorias universais são aplicadas a todos os segmentos.
 * Categorias `segment`-específicas são aplicadas apenas se o tenant for daquele segmento.
 */

export type CategoryTemplate = {
  name:      string
  type:      "receita" | "despesa"
  children?: CategoryTemplate[]
}

// ── Universais (todos segmentos) ────────────────────────────────
const UNIVERSAL_RECEITAS: CategoryTemplate[] = [
  {
    name: "Venda de Mercadoria",
    type: "receita",
    children: [],
  },
  {
    name: "Prestação de Serviço",
    type: "receita",
    children: [],
  },
  { name: "Receita Financeira",   type: "receita" },
  { name: "Outras Receitas",      type: "receita" },
]

const UNIVERSAL_DESPESAS: CategoryTemplate[] = [
  { name: "Custo da Mercadoria (CMV)", type: "despesa" },
  {
    name: "Despesas Operacionais",
    type: "despesa",
    children: [
      { name: "Aluguel",                type: "despesa" },
      { name: "Energia Elétrica",       type: "despesa" },
      { name: "Água",                   type: "despesa" },
      { name: "Internet / Telefone",    type: "despesa" },
      { name: "Material de Escritório", type: "despesa" },
    ],
  },
  {
    name: "Despesas com Pessoal",
    type: "despesa",
    children: [
      { name: "Salários",  type: "despesa" },
      { name: "Encargos",  type: "despesa" },
      { name: "Pró-labore",type: "despesa" },
      { name: "Benefícios",type: "despesa" },
    ],
  },
  {
    name: "Despesas com Vendas",
    type: "despesa",
    children: [
      { name: "Comissões",             type: "despesa" },
      { name: "Marketing / Publicidade", type: "despesa" },
      { name: "Frete sobre Vendas",    type: "despesa" },
    ],
  },
  {
    name: "Despesas Financeiras",
    type: "despesa",
    children: [
      { name: "Tarifas Bancárias",     type: "despesa" },
      { name: "Juros e Multas",        type: "despesa" },
    ],
  },
  {
    name: "Impostos",
    type: "despesa",
    children: [
      { name: "DAS / Simples", type: "despesa" },
      { name: "INSS",          type: "despesa" },
      { name: "IRRF",          type: "despesa" },
    ],
  },
  { name: "Outras Despesas", type: "despesa" },
]

// ── Pescados (subcategorias adicionais) ────────────────────────
const PESCADOS_RECEITAS_CHILDREN: CategoryTemplate[] = [
  { name: "Venda Pescados Resfriados", type: "receita" },
  { name: "Venda Pescados Congelados", type: "receita" },
  { name: "Venda Camarão",             type: "receita" },
  { name: "Venda Salmão",              type: "receita" },
  { name: "Venda Outros Pescados",     type: "receita" },
]

const PESCADOS_DESPESAS: CategoryTemplate[] = [
  {
    name: "Operação Frigorífica",
    type: "despesa",
    children: [
      { name: "Câmara Frigorífica (Energia)", type: "despesa" },
      { name: "Manutenção Refrigeração",      type: "despesa" },
      { name: "Aluguel Frigorífico",          type: "despesa" },
    ],
  },
  {
    name: "Frota Refrigerada",
    type: "despesa",
    children: [
      { name: "Combustível",            type: "despesa" },
      { name: "Manutenção de Veículos", type: "despesa" },
      { name: "Pedágio / Estacionamento", type: "despesa" },
    ],
  },
  {
    name: "Embalagens & Insumos",
    type: "despesa",
    children: [
      { name: "Gelo",        type: "despesa" },
      { name: "Isopor",      type: "despesa" },
      { name: "Sacos / Filmes", type: "despesa" },
    ],
  },
  { name: "Perdas (Avarias e Validade)", type: "despesa" },
]

// ── Móveis Planejados (plano de contas completo) ────────────────
// Estrutura pensada pra loja que vende projeto sob medida (cozinha, dorm,
// sala, banheiro), com fábrica/produção e equipe de instalação.
const MOVEIS_RECEITAS_CHILDREN: CategoryTemplate[] = [
  { name: "Venda Cozinha Planejada",      type: "receita" },
  { name: "Venda Dormitório / Closet",    type: "receita" },
  { name: "Venda Sala / Home Office",     type: "receita" },
  { name: "Venda Banheiro / Lavanderia",  type: "receita" },
  { name: "Venda Móveis Sob Medida (outros)", type: "receita" },
]

// Adicionais em "Prestação de Serviço" universal
const MOVEIS_SERVICOS_CHILDREN: CategoryTemplate[] = [
  { name: "Serviço de Instalação",        type: "receita" },
  { name: "Serviço de Medição Técnica",   type: "receita" },
  { name: "Manutenção / Assistência",     type: "receita" },
]

const MOVEIS_DESPESAS: CategoryTemplate[] = [
  {
    name: "Matéria-Prima",
    type: "despesa",
    children: [
      { name: "Chapas MDF / Madeira",      type: "despesa" },
      { name: "Ferragens (gavetas, dobradiças, puxadores)", type: "despesa" },
      { name: "Vidros e Espelhos",         type: "despesa" },
      { name: "Eletrodomésticos",          type: "despesa" },
      { name: "Granito / Quartzo / Silestone", type: "despesa" },
      { name: "Tintas, Vernizes e Acabamentos", type: "despesa" },
    ],
  },
  {
    name: "Produção / Fábrica",
    type: "despesa",
    children: [
      { name: "Mão de Obra Fabril",        type: "despesa" },
      { name: "Energia da Fábrica",        type: "despesa" },
      { name: "Manutenção CNC / Máquinas", type: "despesa" },
      { name: "Aluguel Fábrica / Galpão",  type: "despesa" },
    ],
  },
  {
    name: "Logística & Instalação",
    type: "despesa",
    children: [
      { name: "Frete de Entrega",          type: "despesa" },
      { name: "Mão de Obra de Instalação", type: "despesa" },
      { name: "Combustível Frota",         type: "despesa" },
      { name: "Pedágio / Estacionamento",  type: "despesa" },
    ],
  },
  {
    name: "Showroom",
    type: "despesa",
    children: [
      { name: "Aluguel Showroom",          type: "despesa" },
      { name: "Decoração / Mostruário",    type: "despesa" },
      { name: "Energia Showroom",          type: "despesa" },
    ],
  },
  {
    name: "Comissões de Parceiros",
    type: "despesa",
    children: [
      { name: "Comissão Designer / Arquiteto Parceiro", type: "despesa" },
      { name: "Comissão Indicação Cliente",             type: "despesa" },
    ],
  },
  {
    name: "Pós-venda & Garantia",
    type: "despesa",
    children: [
      { name: "Retrabalho / Garantia",     type: "despesa" },
      { name: "Assistência Técnica",       type: "despesa" },
    ],
  },
]

// ───────────────────────────────────────────────────────────────

export function buildTemplate(segment: string | null): CategoryTemplate[] {
  // Clone receitas universais
  const receitas = UNIVERSAL_RECEITAS.map((c) => ({ ...c, children: [...(c.children ?? [])] }))

  // Adiciona filhos por segmento em "Venda de Mercadoria"
  const vendaMerc = receitas.find((c) => c.name === "Venda de Mercadoria")!
  if (segment === "pescados") vendaMerc.children = [...PESCADOS_RECEITAS_CHILDREN]
  if (segment === "moveis")   vendaMerc.children = [...MOVEIS_RECEITAS_CHILDREN]

  // Adiciona filhos em "Prestação de Serviço" (móveis vende serviço de instalação separado)
  if (segment === "moveis") {
    const servicos = receitas.find((c) => c.name === "Prestação de Serviço")!
    servicos.children = [...MOVEIS_SERVICOS_CHILDREN]
  }

  // Despesas: universais + extras por segmento
  const extraDespesas =
    segment === "pescados" ? PESCADOS_DESPESAS :
    segment === "moveis"   ? MOVEIS_DESPESAS   :
    []

  return [...receitas, ...UNIVERSAL_DESPESAS, ...extraDespesas]
}
