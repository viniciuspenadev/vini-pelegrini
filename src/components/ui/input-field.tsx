import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:        string
  hint?:         string
  error?:        string
  leadingIcon?:  React.ReactNode
  trailingIcon?: React.ReactNode
  prefix?:       string
  ref?:          React.Ref<HTMLInputElement>
}

// React 19: ref é prop direta, sem forwardRef
export function InputField({
  label, hint, error,
  leadingIcon, trailingIcon, prefix,
  className, id, ref,
  ...props
}: InputFieldProps) {
  const inputId = id ?? React.useId()

  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={inputId} className="text-slate-700">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-muted-foreground font-medium select-none">
            {prefix}
          </span>
        )}
        {leadingIcon && !prefix && (
          <span className="absolute left-3 text-muted-foreground [&_svg]:size-4">
            {leadingIcon}
          </span>
        )}
        <Input
          id={inputId}
          ref={ref}
          className={cn(
            leadingIcon || prefix ? "pl-9" : "",
            trailingIcon ? "pr-9" : "",
            prefix && prefix.length > 2 ? "pl-12" : "",
            error ? "border-destructive focus-visible:ring-destructive/30" : "",
            className
          )}
          {...props}
        />
        {trailingIcon && (
          <span className="absolute right-3 text-muted-foreground [&_svg]:size-4">
            {trailingIcon}
          </span>
        )}
      </div>

      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
