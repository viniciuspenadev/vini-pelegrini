import Link from "next/link"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      { label: string; href: string }
  className?:   string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center px-6",
      className
    )}>
      {icon && (
        <div className="mb-3 text-muted-foreground/50 [&_svg]:size-10">
          {icon}
        </div>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
