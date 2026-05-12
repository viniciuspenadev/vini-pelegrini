# Documento de Sessão — CRM Pescados

**Data:** 11 de maio de 2026  
**Projeto:** `c:\apps\crm` — SaaS multi-tenant de pedidos (Engine Pescados)

---

## Contexto

Este documento cobre duas sessões consecutivas de desenvolvimento. O projeto é um CRM B2B focado em gestão de pedidos para o segmento de pescados. Stack: Next.js 16 (App Router), Supabase, Tailwind CSS, shadcn/ui, NextAuth.

---

## Sessão Anterior — Módulo de Pedidos

### 1. Visualização de variação de peso nos itens

Na página de detalhe do pedido (`/pedidos/[id]`), itens com `venda_peso_variavel = true` passaram a exibir:

- Quantidade solicitada (original)
- Peso real pesado (em verde)
- Diferença absoluta e percentual (▲ azul se maior, ▼ vermelho se menor)

**Lógica:**
```ts
const diff    = item.actual_weight - item.requested_quantity
const absDiff = Math.abs(diff)
const pct     = ((diff / item.requested_quantity) * 100).toFixed(1)
```

### 2. Espaçamento compacto na lista de itens

Ajuste visual na lista de itens solicitados: `space-y-1.5`, `px-4 py-3`, ícone `h-9 w-9`. Resultado mais denso e profissional para gestão visual.

### 3. Edição inline de itens (`OrderItemsEditor`)

**Arquivo:** `src/components/order-items-editor.tsx`

Componente client com dois modos (visualização / edição):

- **Edição disponível apenas em:** `recebido` e `em_separacao`
- **Campos editáveis por item:** `requested_quantity`, `unit_price`, `discount_pct`, `item_notes`
- **Preview ao vivo:** subtotal recalculado em tempo real enquanto o usuário digita
- **Ao salvar:** recalcula `discount_amount`, `subtotal` e `estimated_total_amount` do pedido

**Server action criada:** `updateOrderItems(orderId, updates[])` em `src/lib/actions/orders.ts`

**Histórico automático:** registra no `order_status_history` com `from_status = to_status = status_atual` e `notes` descritivo por item alterado. Ex:
```
Itens alterados — Salmão (qty: 10 → 12, preço: R$ 45,00 → R$ 48,00)
```

### 4. Edição inline de condições (`OrderConditionsEditor`)

**Arquivo:** `src/components/order-conditions-editor.tsx`

Componente client que substitui o antigo bloco de logística estático:

- **Edição bloqueada em:** `cancelado` e `entregue`
- **Campos editáveis:** data de entrega, hora preferida, endereço alternativo, forma de pagamento, condição de pagamento, notas de operação
- **Ao salvar:** compara campos antigos vs novos e gera diff no histórico. Ex:
```
Condições alteradas — Pagamento: "PIX"; Data de entrega: "2026-05-15"
```

**Server action criada:** `updateOrderConditions(orderId, data)` em `src/lib/actions/orders.ts`

### 5. Página de detalhe do pedido — arquitetura final

**Arquivo:** `src/app/(app)/pedidos/[id]/page.tsx`

Bento grid com os seguintes blocos:
1. Header (número, status, data)
2. Banner de pesagem pendente (condicional)
3. Card do cliente (nome, CNPJ, contato, endereço)
4. `OrderConditionsEditor` — logística + pagamento
5. `OrderPipeline` — progresso do status
6. `OrderItemsEditor` — itens + total
7. Responsável + Condições Comerciais do cliente
8. `OrderHistory` — histórico de alterações

---

## Sessão Atual

### 6. Remoção do bloco "Faturamento Total" (gradiente)

O bloco azul/índigo/roxo com gradiente que exibia o total do pedido foi removido por ser visualmente pesado ("grosseiro"). As informações foram movidas para o rodapé do `OrderItemsEditor`.

**Mudanças em:**
- `src/app/(app)/pedidos/[id]/page.tsx` — bloco removido, import `DollarSign` removido, `BRL` helper removido, card do cliente expandido de `xl:col-span-2` para `xl:col-span-3`
- `src/components/order-items-editor.tsx` — nova prop `estimatedTotal`, rodapé enriquecido

**Rodapé novo do `OrderItemsEditor`:**
- Linha de desconto total (se houver)
- Linha de diff: "Estimativa inicial / +R$ X" (se pedido final e valores divergem)
- Linha principal: label + badge de status ("Confirmado" verde / "Estimado" âmbar) + valor em destaque

### 7. Módulo de Clientes — Página de Detalhe Completa

#### Estado anterior
- `/clientes` → tabela simples
- `/clientes/[id]` → formulário de edição direto (sem detalhe)
- `/clientes/novo` → formulário de criação

#### Estado atual

**`/clientes/[id]/page.tsx`** — reescrito como página de detalhe (bento grid):

| Seção | Conteúdo |
|---|---|
| **Header** | Nome (fantasia ou razão social), status badge, CNPJ monospace, botão "Editar cadastro" |
| **4 KPI cards** | Total Pedidos · Receita Total · Ticket Médio · Em Andamento |
| **Card Contato** | Comprador, WhatsApp, Email Financeiro |
| **Card Endereço** | Endereço completo formatado + Rota de Entrega |
| **Card Regras Comerciais** | Tabela de preço, condição de pagamento, IE + **barra de uso de crédito** (verde → âmbar → vermelho) |
| **Lista de Pedidos** | Número, status badge, data de entrega, total — cada linha clicável para `/pedidos/[id]` |

**Cálculos dos KPIs:**
```ts
const activeOrders = ordersData.filter(o => !["cancelado", "entregue"].includes(o.status))
const billedOrders = ordersData.filter(o => o.status !== "cancelado")
const receitaTotal = billedOrders.reduce((s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)
const ticketMedio  = billedOrders.length > 0 ? receitaTotal / billedOrders.length : 0
const creditoEmUso = activeOrders.reduce((s, o) => s + Number(o.final_total_amount ?? o.estimated_total_amount ?? 0), 0)
```

**Barra de crédito:**
- Verde: uso < 70%
- Âmbar: uso 70–89%
- Vermelho: uso ≥ 90%

---

**`/clientes/[id]/editar/page.tsx`** — nova rota criada com:
- Topbar com breadcrumb: `Clientes > Nome > Editar`
- Botão de volta para `/clientes/[id]`
- `CustomerForm` com dados pré-preenchidos (comportamento anterior, agora em rota própria)

---

**`/clientes/page.tsx`** — lista atualizada:
- Nome do cliente virou link clicável para `/clientes/[id]` (detalhe), com hover azul
- Botão "Editar" agora aponta para `/clientes/[id]/editar` (direto ao formulário)

---

## Arquivos modificados/criados nesta sessão

| Arquivo | Ação |
|---|---|
| `src/app/(app)/pedidos/[id]/page.tsx` | Modificado — bloco financeiro removido, col-span ajustado, prop `estimatedTotal` adicionada |
| `src/components/order-items-editor.tsx` | Modificado — prop `estimatedTotal`, rodapé com badge + diff |
| `src/app/(app)/clientes/[id]/page.tsx` | Reescrito — página de detalhe completa |
| `src/app/(app)/clientes/[id]/editar/page.tsx` | Criado — formulário de edição em rota separada |
| `src/app/(app)/clientes/page.tsx` | Modificado — links atualizados |

---

## Módulos em Backlog

- **Fiscal / NF-e** — deliberadamente deixado para depois
- **Dashboard com KPIs globais** — sugerido, não iniciado
- **Contas a Receber** — sugerido, não iniciado
- **Painel Admin / God Mode** — sugerido, não iniciado

---

## Decisões técnicas relevantes

| Decisão | Motivo |
|---|---|
| Reuso de `order_status_history` para edições | Sem migração de schema: `from_status = to_status = status_atual`, diff em `notes` |
| Componentes editor auto-wrapping | Cada editor inclui seu próprio card wrapper com `col-span` correto, simplificando a page.tsx |
| Status gates no servidor e no cliente | Servidor valida antes de salvar; cliente esconde o botão de edição visualmente |
| `/clientes/[id]/editar` como rota separada | Fluxo mais limpo: detalhe → decisão de editar → formulário, com back button natural |
| Crédito em uso baseado em pedidos ativos | Exclui cancelados e entregues; representa exposição financeira real |
