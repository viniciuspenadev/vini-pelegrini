import { requireModule } from "@/lib/modules"

export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  await requireModule(["financeiro.receber", "financeiro.pagamentos"])
  return <>{children}</>
}
