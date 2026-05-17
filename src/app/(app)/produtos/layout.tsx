import { requireModule } from "@/lib/modules"

export default async function ProdutosLayout({ children }: { children: React.ReactNode }) {
  await requireModule(["pescados.produtos", "moveis.produtos"])
  return <>{children}</>
}
