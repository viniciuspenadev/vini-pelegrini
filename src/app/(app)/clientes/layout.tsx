import { requireModule } from "@/lib/modules"

export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  await requireModule("core.crm")
  return <>{children}</>
}
