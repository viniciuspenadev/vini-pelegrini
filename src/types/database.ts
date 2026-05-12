export type CustomerStatus = "ativo" | "inativo" | "bloqueado"
export type ProductStatus  = "ativo" | "inativo"
export type UserRole       = "owner" | "admin" | "vendedor" | "financeiro"

export interface Customer {
  id:                 string
  tenant_id:          string
  owner_id:           string
  created_by:         string
  razao_social:       string
  nome_fantasia:      string | null
  cnpj_cpf:           string
  inscricao_estadual: string | null
  isento_ie:          boolean
  cep:                string | null
  logradouro:         string | null
  numero:             string | null
  complemento:        string | null
  bairro:             string | null
  cidade:             string | null
  estado:             string | null
  rota_entrega:       string | null
  comprador_nome:     string | null
  comprador_whatsapp: string | null
  email_financeiro:   string | null
  tabela_preco:       string
  limite_credito:     number
  condicao_pagamento: string
  forma_pagamento:    string | null
  desconto_padrao:    number
  vendedor_id:        string | null
  regime_tributario:  string | null
  contribuinte_icms:  boolean
  email_nfe:          string | null
  telefone:           string | null
  janela_entrega:     string | null
  instrucoes_entrega: string | null
  status:             CustomerStatus
  observacoes:        string | null
  created_at:         string
  updated_at:         string
}

export interface ProductMetadata {
  tipo_conservacao?:     "resfriado" | "congelado" | "fresco" | "salgado"
  venda_peso_variavel?:  boolean
  peso_medio_estimado?:  number
  dias_validade?:        number
}

export interface Product {
  id:             string
  tenant_id:      string
  created_by:     string
  nome:           string
  sku:            string | null
  categoria:      string | null
  unidade_medida: string
  preco_base:     number
  status:         ProductStatus
  metadata:       ProductMetadata
  created_at:     string
  updated_at:     string
}
