"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check, Search } from "lucide-react"

export interface ComboboxOption {
  value:     string
  label:     string
  sublabel?: string
}

interface ComboboxProps {
  options:            ComboboxOption[]
  value?:             string
  onChange:           (value: string) => void
  placeholder?:       string
  searchPlaceholder?: string
  className?:         string
  disabled?:          boolean
}

export function Combobox({
  options, value, onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  className, disabled,
}: ComboboxProps) {
  const [open,   setOpen]   = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [rect,   setRect]   = React.useState<DOMRect | null>(null)

  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const dropRef   = React.useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.sublabel?.toLowerCase().includes(search.toLowerCase())
  )

  function openDropdown() {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    setOpen(true)
  }

  // Recalcula posição no scroll/resize
  React.useEffect(() => {
    if (!open) return
    function update() {
      if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  // Fecha ao clicar fora
  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (
        buttonRef.current?.contains(target) ||
        dropRef.current?.contains(target)
      ) return
      setOpen(false)
      setSearch("")
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  function select(val: string) {
    onChange(val)
    setOpen(false)
    setSearch("")
  }

  // Decide se abre para cima ou para baixo
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUp     = spaceBelow < 240 && rect ? rect.top > 240 : false

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => open ? (setOpen(false), setSearch("")) : openDropdown()}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {/* Dropdown fixo — escapa de qualquer overflow:hidden */}
      {open && rect && (
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            left:     rect.left,
            width:    rect.width,
            ...(openUp
              ? { bottom: window.innerHeight - rect.top + 4 }
              : { top: rect.bottom + 4 }),
          }}
          className="z-[999] rounded-lg border border-border bg-popover shadow-xl"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
                    value === o.value && "bg-accent"
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 text-left">
                    <span className="block font-medium">{o.label}</span>
                    {o.sublabel && <span className="block text-xs text-muted-foreground">{o.sublabel}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
