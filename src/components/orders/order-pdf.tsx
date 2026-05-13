import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const DATE = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })

const STATUS_LABELS: Record<string, string> = {
  recebido:               "Recebido",
  em_separacao:           "Em Separação",
  aguardando_faturamento: "Ag. Faturamento",
  faturado:               "Faturado",
  em_rota:                "Em Rota",
  entregue:               "Entregue",
  cancelado:              "Cancelado",
}

const s = StyleSheet.create({
  page:            { fontFamily: "Helvetica", backgroundColor: "#fff", paddingVertical: 40, paddingHorizontal: 44 },

  // Header
  headerRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  tenantBlock:     { flexDirection: "row", alignItems: "center", gap: 10 },
  tenantAvatar:    { width: 36, height: 36, borderRadius: 8, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  tenantInitial:   { color: "#fff", fontSize: 16, fontFamily: "Helvetica-Bold" },
  tenantName:      { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  tenantSub:       { fontSize: 9, color: "#94a3b8", marginTop: 2 },
  orderBlock:      { alignItems: "flex-end" },
  orderNum:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  statusBadge:     { marginTop: 4, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: "#eff6ff", borderRadius: 20 },
  statusText:      { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },

  // Divider
  divider:         { height: 1, backgroundColor: "#e2e8f0", marginBottom: 20 },

  // Info grid
  infoGrid:        { flexDirection: "row", gap: 24, marginBottom: 24 },
  infoCol:         { flex: 1 },
  infoLabel:       { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  infoName:        { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 2 },
  infoText:        { fontSize: 9.5, color: "#475569", marginBottom: 1.5 },
  infoMono:        { fontSize: 9, color: "#94a3b8", fontFamily: "Helvetica", marginBottom: 2 },

  // Details rows
  detailRow:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  detailKey:       { fontSize: 9, color: "#94a3b8" },
  detailVal:       { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#334155" },

  // Table
  tableHeader:     { flexDirection: "row", backgroundColor: "#f8fafc", borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 0 },
  tableHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow:        { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  tableRowAlt:     { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", backgroundColor: "#fafafa" },
  colName:         { flex: 1 },
  colUnit:         { width: 40, textAlign: "center" },
  colQty:          { width: 55, textAlign: "right" },
  colPrice:        { width: 70, textAlign: "right" },
  colTotal:        { width: 80, textAlign: "right" },
  itemName:        { fontSize: 10, color: "#0f172a", fontFamily: "Helvetica-Bold" },
  itemSku:         { fontSize: 8, color: "#94a3b8", marginTop: 1 },
  itemUnitBadge:   { fontSize: 9, color: "#64748b" },
  itemNum:         { fontSize: 10, color: "#334155", tabularNums: true },
  itemTotal:       { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  itemDiscount:    { fontSize: 8, color: "#16a34a", marginTop: 1 },

  // Totals
  totalsContainer: { marginTop: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", alignItems: "flex-end" },
  totalRow:        { flexDirection: "row", justifyContent: "space-between", width: 200, marginBottom: 3 },
  totalLabel:      { fontSize: 9, color: "#64748b" },
  totalValue:      { fontSize: 9, color: "#16a34a" },
  grandTotalRow:   { flexDirection: "row", justifyContent: "space-between", width: 200, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#cbd5e1" },
  grandLabel:      { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  grandValue:      { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  estimatedNote:   { fontSize: 8, color: "#94a3b8", marginTop: 3, textAlign: "right", width: 200 },

  // Notes
  notesBox:        { marginTop: 16, padding: 10, backgroundColor: "#fffbeb", borderRadius: 6, borderWidth: 1, borderColor: "#fde68a" },
  notesLabel:      { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#d97706", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  notesText:       { fontSize: 9.5, color: "#92400e", lineHeight: 1.5 },

  // Footer
  footer:          { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 },
  footerText:      { fontSize: 8, color: "#cbd5e1" },
  footerValidity:  { fontSize: 8, color: "#94a3b8" },
})

export interface OrderPDFData {
  orderNumber: number
  status: string
  createdAt: string
  deliveryDate?: string | null
  deliveryTime?: string | null
  paymentMethod?: string | null
  paymentCondition?: string | null
  customerPo?: string | null
  logisticsNotes?: string | null
  estimatedTotal: number
  finalTotal?: number | null
  tenantName: string
  customerRazaoSocial: string
  customerNomeFantasia?: string | null
  customerCnpj?: string | null
  customerCidade?: string | null
  customerEstado?: string | null
  compradorNome?: string | null
  compradorWhatsapp?: string | null
  expiresAt: string
  items: Array<{
    nome: string
    sku?: string | null
    unidade: string
    qty: number
    unitPrice: number
    subtotal: number
    discountPct: number
    discountAmount: number
    vendaPesoVariavel: boolean
  }>
}

export function OrderPDFDocument({ data }: { data: OrderPDFData }) {
  const orderNum    = String(data.orderNumber).padStart(4, "0")
  const statusLabel = STATUS_LABELS[data.status] ?? data.status
  const display     = data.finalTotal ?? data.estimatedTotal
  const isFinal     = !!data.finalTotal
  const totalDiscount = data.items.reduce((s, i) => s + i.discountAmount, 0)
  const customerName  = data.customerNomeFantasia || data.customerRazaoSocial
  const tenantInitial = (data.tenantName ?? "P")[0].toUpperCase()
  const expDate       = new Date(data.expiresAt).toLocaleDateString("pt-BR")

  return (
    <Document
      title={`Pedido #${orderNum} — ${data.tenantName}`}
      author={data.tenantName}
      creator="PedidosPro"
    >
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.tenantBlock}>
            <View style={s.tenantAvatar}>
              <Text style={s.tenantInitial}>{tenantInitial}</Text>
            </View>
            <View>
              <Text style={s.tenantName}>{data.tenantName}</Text>
              <Text style={s.tenantSub}>Documento comercial</Text>
            </View>
          </View>
          <View style={s.orderBlock}>
            <Text style={s.orderNum}>#{orderNum}</Text>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Info grid */}
        <View style={s.infoGrid}>
          {/* Customer */}
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Para</Text>
            <Text style={s.infoName}>{customerName}</Text>
            {data.customerCnpj && (
              <Text style={s.infoMono}>{data.customerCnpj}</Text>
            )}
            {(data.customerCidade || data.customerEstado) && (
              <Text style={s.infoText}>
                {[data.customerCidade, data.customerEstado].filter(Boolean).join(" — ")}
              </Text>
            )}
            {data.compradorNome && (
              <Text style={[s.infoText, { marginTop: 6 }]}>{data.compradorNome}</Text>
            )}
            {data.compradorWhatsapp && (
              <Text style={s.infoText}>{data.compradorWhatsapp}</Text>
            )}
          </View>

          {/* Details */}
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Detalhes</Text>
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Emissão</Text>
              <Text style={s.detailVal}>{DATE_SHORT(data.createdAt.split("T")[0])}</Text>
            </View>
            {data.deliveryDate && (
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Entrega</Text>
                <Text style={s.detailVal}>{DATE_SHORT(data.deliveryDate)}</Text>
              </View>
            )}
            {data.deliveryTime && (
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Turno</Text>
                <Text style={s.detailVal}>{data.deliveryTime}</Text>
              </View>
            )}
            {data.paymentCondition && (
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Pagamento</Text>
                <Text style={s.detailVal}>{data.paymentCondition}</Text>
              </View>
            )}
            {data.paymentMethod && (
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Forma</Text>
                <Text style={s.detailVal}>{data.paymentMethod}</Text>
              </View>
            )}
            {data.customerPo && (
              <View style={s.detailRow}>
                <Text style={s.detailKey}>PO</Text>
                <Text style={s.detailVal}>{data.customerPo}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colName]}>Produto</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Unid.</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qtd.</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>Unit.</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>Subtotal</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <View style={s.colName}>
              <Text style={s.itemName}>{item.nome}</Text>
              {item.sku && <Text style={s.itemSku}>{item.sku}</Text>}
            </View>
            <Text style={[s.itemUnitBadge, s.colUnit]}>{item.unidade}</Text>
            <Text style={[s.itemNum, s.colQty]}>
              {Number(item.qty).toLocaleString("pt-BR")}
            </Text>
            <Text style={[s.itemNum, s.colPrice]}>{BRL(item.unitPrice)}</Text>
            <View style={s.colTotal}>
              <Text style={[s.itemTotal, { textAlign: "right" }]}>{BRL(item.subtotal)}</Text>
              {item.discountPct > 0 && (
                <Text style={[s.itemDiscount, { textAlign: "right" }]}>
                  -{item.discountPct.toFixed(0)}% desc.
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsContainer}>
          {totalDiscount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Descontos</Text>
              <Text style={s.totalValue}>- {BRL(totalDiscount)}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandLabel}>{isFinal ? "Total" : "Total estimado"}</Text>
            <Text style={s.grandValue}>{BRL(Number(display))}</Text>
          </View>
          {!isFinal && (
            <Text style={s.estimatedNote}>Sujeito a ajuste após pesagem</Text>
          )}
        </View>

        {/* Notes */}
        {data.logisticsNotes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Observações</Text>
            <Text style={s.notesText}>{data.logisticsNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Gerado por PedidosPro · Documento de uso comercial</Text>
          <Text style={s.footerValidity}>Válido até {expDate}</Text>
        </View>

      </Page>
    </Document>
  )
}
