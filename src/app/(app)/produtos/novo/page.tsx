import { LinkButton } from "@/components/ui/link-button"
import { ProductForm } from "@/components/product-form"
import { ChevronLeft } from "lucide-react"

export default function NovoProdutoPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <LinkButton href="/produtos" variant="ghost" size="sm">
          <ChevronLeft className="size-4" />
          Produtos
        </LinkButton>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-6">Novo produto</h1>
      <ProductForm />
    </div>
  )
}
