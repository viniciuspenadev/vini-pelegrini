"use client"

import * as React from "react"
import { InputField } from "@/components/ui/input-field"
import {
  maskCNPJorCPF, maskPhone, maskCEP,
  maskCurrency, unmaskCurrency,
  maskDecimal, unmaskDecimal,
} from "@/lib/masks"

type MaskType = "cnpj-cpf" | "phone" | "cep" | "currency" | "decimal"

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask:          MaskType
  label?:        string
  hint?:         string
  error?:        string
  leadingIcon?:  React.ReactNode
  trailingIcon?: React.ReactNode
  prefix?:       string
  name?:         string
}

const MASK_FN: Record<MaskType, (v: string) => string> = {
  "cnpj-cpf": maskCNPJorCPF,
  phone:      maskPhone,
  cep:        maskCEP,
  currency:   maskCurrency,
  decimal:    maskDecimal,
}

const NEEDS_HIDDEN: Record<MaskType, boolean> = {
  "cnpj-cpf": false,
  phone:      false,
  cep:        false,
  currency:   true,
  decimal:    true,
}

function getInitialRaw(mask: MaskType, display: string) {
  if (mask === "currency") return unmaskCurrency(display)
  if (mask === "decimal")  return unmaskDecimal(display)
  return display
}

// Converte o defaultValue para o formato de display correto
// evitando que números JS (ponto decimal) corrompam a máscara
function buildInitialDisplay(mask: MaskType, defaultValue: unknown): string {
  if (defaultValue === undefined || defaultValue === null || defaultValue === "") return ""
  const num = Number(defaultValue)
  if (isNaN(num)) return MASK_FN[mask](String(defaultValue))

  if (mask === "decimal") {
    // JS usa ponto, pt-BR usa vírgula — converter antes do mask
    return num.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
  }
  if (mask === "currency") {
    // maskCurrency espera valor em centavos como string de dígitos
    return maskCurrency(String(Math.round(num * 100)))
  }
  return MASK_FN[mask](String(defaultValue))
}

export function MaskedInput({
  mask, name, defaultValue,
  label, hint, error,
  leadingIcon, trailingIcon, prefix,
  ...props
}: MaskedInputProps) {
  const initial = React.useMemo(
    () => buildInitialDisplay(mask, defaultValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [display, setDisplay] = React.useState(initial)
  const [raw, setRaw]         = React.useState(() => getInitialRaw(mask, initial))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = MASK_FN[mask](e.target.value)
    setDisplay(masked)
    setRaw(getInitialRaw(mask, masked))
  }

  const useHidden = NEEDS_HIDDEN[mask]

  return (
    <>
      <InputField
        label={label}
        hint={hint}
        error={error}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        prefix={prefix}
        value={display}
        onChange={handleChange}
        inputMode={mask === "currency" || mask === "decimal" ? "decimal" : "text"}
        {...props}
        name={useHidden ? undefined : name}
      />
      {name && useHidden && (
        <input type="hidden" name={name} value={raw} />
      )}
    </>
  )
}
