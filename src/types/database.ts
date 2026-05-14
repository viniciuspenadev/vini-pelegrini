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
  // Fiscal
  codigo_ibge:        string | null
  pais_codigo:        string | null
  pais_nome:          string | null
  suframa:            string | null
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
  // Fiscal
  ncm:             string | null
  cest:            string | null
  origem:          number | null
  cfop_padrao:     string | null
  cst_icms:        string | null
  csosn_icms:      string | null
  cst_pis:         string | null
  cst_cofins:      string | null
  aliquota_icms:   number | null
  aliquota_pis:    number | null
  aliquota_cofins: number | null
  ean:             string | null
  // CMV
  preco_custo:     number | null
  created_at:     string
  updated_at:     string
}

export interface OrderTask {
  id:           string
  order_id:     string
  tenant_id:    string
  title:        string
  done:         boolean
  assignee_id:  string | null
  due_date:     string | null
  position:     number
  created_at:   string
  created_by:   string | null
  completed_at: string | null
  completed_by: string | null
}

export type AttachmentCategory = "pedido" | "nfe" | "comprovante" | "foto" | "contrato" | "outros"

export interface OrderAttachment {
  id:              string
  order_id:        string
  tenant_id:       string
  file_name:       string
  file_size_bytes: number | null
  mime_type:       string | null
  storage_path:    string
  category:        AttachmentCategory
  description:     string | null
  uploaded_at:     string
  uploaded_by:     string | null
}

// ═══════════════════════════════════════════════════════════════
// Tags universais (polimórficas)
// ═══════════════════════════════════════════════════════════════

export type TaggableType = "contact" | "customer" | "order" | "conversation" | "lead"

export interface Tag {
  id:          string
  tenant_id:   string
  name:        string
  color:       string  // hex
  description: string | null
  created_at:  string
  updated_at:  string
}

export interface Tagging {
  id:            string
  tag_id:        string
  tenant_id:     string
  taggable_type: TaggableType
  taggable_id:   string
  tagged_at:     string
  tagged_by:     string | null
}

export type OrderStatus =
  | "recebido"
  | "em_separacao"
  | "aguardando_faturamento"
  | "faturado"
  | "em_rota"
  | "entregue"
  | "cancelado"

export interface Order {
  id:                       string
  tenant_id:                string
  customer_id:              string
  owner_id:                 string
  created_by:               string
  order_number:             number
  status:                   OrderStatus
  priority:                 "normal" | "urgente"
  delivery_date:            string | null
  delivery_time:            string | null
  delivery_address:         string | null
  logistics_notes:          string | null
  payment_method:           string | null
  payment_condition:        string | null
  customer_po:              string | null
  estimated_total_amount:   number
  final_total_amount:       number | null
  // NFe — campos SEFAZ-compliant
  modalidade_frete:         number       // modFrete: 0=emitente,1=destinatario,2=terceiros,3=proprio-emit,4=proprio-dest,9=sem-frete
  valor_frete:              number
  valor_seguro:             number
  finalidade_emissao:       number       // finNFe: 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolucao
  presenca_comprador:       number       // indPres: 0=NA, 1=Presencial, 2=Internet, 4=Telemarketing, 5=NFCe-domicilio, 9=Outros nao-presencial
  consumidor_final:         boolean      // indFinal: false p/ revenda B2B, true p/ consumidor final
  created_at:               string
  updated_at:               string
}

// ═══════════════════════════════════════════════════════════════
// Financeiro — universal entre segmentos
// ═══════════════════════════════════════════════════════════════

export type CategoryType   = "receita" | "despesa"
export type BankAccountType = "corrente" | "poupanca" | "caixa" | "pix" | "carteira_digital" | "outros"
export type ReceivableStatus = "aberto" | "parcial" | "pago" | "vencido" | "cancelado"
export type PayableStatus    = ReceivableStatus
export type TransactionType  = "entrada" | "saida" | "transferencia" | "ajuste"
export type OriginType       = "order" | "subscription" | "contract" | "manual"

export interface FinancialCategory {
  id:         string
  tenant_id:  string
  parent_id:  string | null
  name:       string
  type:       CategoryType
  segment:    string | null    // 'pescados' | 'moveis' | null=universal (apenas pra template inicial)
  active:     boolean
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id:              string
  tenant_id:       string
  name:            string
  type:            BankAccountType
  bank_name:       string | null
  bank_code:       string | null
  agency:          string | null
  account_number:  string | null
  initial_balance: number
  current_balance: number
  active:          boolean
  created_at:      string
  updated_at:      string
}

export interface AccountReceivable {
  id:                string
  tenant_id:         string
  customer_id:       string
  category_id:       string | null
  origin_type:       OriginType
  origin_id:         string | null
  description:       string
  installment_seq:   number | null
  installment_total: number | null
  amount:            number
  paid_amount:       number
  due_date:          string             // YYYY-MM-DD
  paid_at:           string | null
  bank_account_id:   string | null
  status:            ReceivableStatus
  payment_method:    string | null
  notes:             string | null
  asaas_charge_id:   string | null
  asaas_invoice_url: string | null
  created_at:        string
  updated_at:        string
  created_by:        string | null
}

export interface AccountPayable {
  id:              string
  tenant_id:       string
  category_id:     string | null
  supplier_name:   string
  supplier_cnpj:   string | null
  description:     string
  amount:          number
  paid_amount:     number
  due_date:        string
  paid_at:         string | null
  bank_account_id: string | null
  status:          PayableStatus
  payment_method:  string | null
  notes:           string | null
  document_type:   string | null
  document_number: string | null
  created_at:      string
  updated_at:      string
  created_by:      string | null
}

export interface FinancialTransaction {
  id:                     string
  tenant_id:              string
  bank_account_id:        string
  type:                   TransactionType
  amount:                 number
  transaction_date:       string
  description:            string
  category_id:            string | null
  receivable_id:          string | null
  payable_id:             string | null
  transfer_to_account_id: string | null
  notes:                  string | null
  created_at:             string
  created_by:             string | null
}

export interface TenantFinancialConfig {
  tenant_id:                  string
  auto_generate_receivables:  boolean
  trigger_status:             string
  default_bank_account_id:    string | null
  default_payment_method:     string | null
  show_dre:                   boolean
  fiscal_year_start_month:    number
  created_at:                 string
  updated_at:                 string
}

// ═══════════════════════════════════════════════════════════════
// Fiscal (NF-e)
// ═══════════════════════════════════════════════════════════════

export interface TenantFiscalConfig {
  tenant_id:           string
  razao_social:        string | null
  nome_fantasia:       string | null
  cnpj:                string | null
  inscricao_estadual:  string | null
  inscricao_municipal: string | null
  regime_tributario:   number | null
  cnae:                string | null
  cep:                 string | null
  logradouro:          string | null
  numero:              string | null
  complemento:         string | null
  bairro:              string | null
  cidade:              string | null
  estado:              string | null
  codigo_ibge:         string | null
  telefone:            string | null
  email:               string | null
  certificado_a1:      string | null
  certificado_senha:   string | null
  certificado_validade: string | null
  ambiente:            number
  serie_nfe:           number
  proximo_numero_nfe:  number
  natureza_operacao:   string
  provider:            string
  provider_token:      string | null
  created_at:          string
  updated_at:          string
}
