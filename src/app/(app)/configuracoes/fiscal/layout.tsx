import { requireModule } from "@/lib/modules"

export default async function FiscalConfigLayout({ children }: { children: React.ReactNode }) {
  await requireModule(["fiscal.config", "fiscal.nfe"])
  return <>{children}</>
}
