import { requireModule } from "@/lib/modules"

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  await requireModule([
    "marketing.inbox",
    "marketing.pipeline",
    "marketing.contatos",
    "marketing.campanhas",
  ])
  return <>{children}</>
}
