"use client"

import * as React from "react"
import { InputField } from "@/components/ui/input-field"
import { maskCEP, digits } from "@/lib/masks"
import { MapPin, Loader2 } from "lucide-react"

interface ViaCEPResponse {
  logradouro: string
  bairro:     string
  localidade: string
  uf:         string
  erro?:      boolean
}

interface CepInputProps {
  defaultValue?: string
  onAddressFill?: (address: {
    logradouro: string
    bairro:     string
    cidade:     string
    estado:     string
  }) => void
}

export function CepInput({ defaultValue, onAddressFill }: CepInputProps) {
  const [value,   setValue]   = React.useState(defaultValue ? maskCEP(defaultValue) : "")
  const [status,  setStatus]  = React.useState<"idle" | "loading" | "error">("idle")

  async function fetchAddress(cep: string) {
    const clean = digits(cep)
    if (clean.length !== 8) return

    setStatus("loading")
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json() as ViaCEPResponse

      if (data.erro) {
        setStatus("error")
        return
      }

      setStatus("idle")
      onAddressFill?.({
        logradouro: data.logradouro,
        bairro:     data.bairro,
        cidade:     data.localidade,
        estado:     data.uf,
      })
    } catch {
      setStatus("error")
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCEP(e.target.value)
    setValue(masked)

    if (digits(masked).length === 8) {
      fetchAddress(masked)
    } else {
      setStatus("idle")
    }
  }

  return (
    <InputField
      label="CEP"
      name="cep"
      value={value}
      onChange={handleChange}
      inputMode="numeric"
      placeholder="00000-000"
      maxLength={9}
      leadingIcon={
        status === "loading"
          ? <Loader2 className="animate-spin" />
          : <MapPin />
      }
      error={status === "error" ? "CEP não encontrado" : undefined}
    />
  )
}
