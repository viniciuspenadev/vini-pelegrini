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
  { name: "Prestação de Serviço", type: "receita" },
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

// ── Móveis (placeholder, expandir quando for ativado) ──────────
const MOVEIS_RECEITAS_CHILDREN: CategoryTemplate[] = [
  { name: "Venda Móveis Sala",    type: "receita" },
  { name: "Venda Móveis Quarto",  type: "receita" },
  { name: "Venda Móveis Cozinha", type: "receita" },
  { name: "Venda Estofados",      type: "receita" },
]

const MOVEIS_DESPESAS: CategoryTemplate[] = [
  { name: "Frete de Entrega", type: "despesa" },
  { name: "Montagem",         type: "despesa" },
  { name: "Showroom",         type: "despesa" },
]

// ───────────────────────────────────────────────────────────────

export function buildTemplate(segment: string | null): CategoryTemplate[] {
  // Clone receitas universais
  const receitas = UNIVERSAL_RECEITAS.map((c) => ({ ...c, children: [...(c.children ?? [])] }))

  // Adiciona filhos por segmento em "Venda de Mercadoria"
  const vendaMerc = receitas.find((c) => c.name === "Venda de Mercadoria")!
  if (segment === "pescados") vendaMerc.children = [...PESCADOS_RECEITAS_CHILDREN]
  if (segment === "moveis")   vendaMerc.children = [...MOVEIS_RECEITAS_CHILDREN]

  // Despesas: universais + extras por segmento
  const extraDespesas =
    segment === "pescados" ? PESCADOS_DESPESAS :
    segment === "moveis"   ? MOVEIS_DESPESAS   :
    []

  return [...receitas, ...UNIVERSAL_DESPESAS, ...extraDespesas]
}
