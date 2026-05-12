// Retorna somente dígitos
export const digits = (v: string) => v.replace(/\D/g, "")

export function maskCPF(v: string) {
  return digits(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function maskCNPJ(v: string) {
  return digits(v).slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

// Detecta CPF ou CNPJ pelo número de dígitos digitados
export function maskCNPJorCPF(v: string) {
  const d = digits(v)
  return d.length <= 11 ? maskCPF(d) : maskCNPJ(d)
}

export function maskPhone(v: string) {
  const d = digits(v).slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 10)
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2")
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2")
}

export function maskCEP(v: string) {
  return digits(v).slice(0, 8).replace(/(\d{5})(\d{1,3})$/, "$1-$2")
}

export function maskCurrency(v: string) {
  const d = digits(v).slice(0, 12)
  if (!d) return ""
  const num = parseInt(d, 10) / 100
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Para enviar ao servidor: remove formatação
export function unmaskCurrency(v: string) {
  const d = digits(v)
  if (!d) return "0"
  return (parseInt(d, 10) / 100).toString()
}

// Decimal pt-BR: vírgula como separador decimal, ponto como milhar.
// Estratégia: remove pontos (milhar) e mantém só dígitos + vírgula.
// Assim "1.200" + "0" → limpa para "12000" → formata como "12.000" (correto).
export function maskDecimal(v: string, maxDecimals = 3) {
  if (!v) return ""

  // 1. Remove tudo que não é dígito ou vírgula
  //    (pontos de milhar são descartados — o usuário não precisa digitá-los)
  const clean = v.replace(/[^\d,]/g, "")

  // 2. Separa parte inteira e decimal pela vírgula
  const [intRaw, ...decParts] = clean.split(",")
  const hasComma  = clean.includes(",")
  const decRaw    = decParts.join("").slice(0, maxDecimals)

  // 3. Formata parte inteira com separador de milhar (ponto em pt-BR)
  const intFormatted = (intRaw || "0")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  // 4. Reconstrói
  if (hasComma) return `${intFormatted},${decRaw}`
  return intFormatted
}

export function unmaskDecimal(v: string) {
  // Remove pontos de milhar, substitui vírgula decimal por ponto → parseFloat
  return v.replace(/\./g, "").replace(",", ".") || "0"
}
