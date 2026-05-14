"use client"

import Link from "next/link"
import { formatPhoneDisplay } from "@/lib/evolution-api"
import {
  User, Phone, Mail, MapPin, Tag, ShoppingCart,
  DollarSign, ExternalLink,
} from "lucide-react"
import type { ChatContact } from "@/types/chat"

interface CustomerInfo {
  id:              string
  razao_social:    string
  nome_fantasia:   string | null
  cnpj_cpf:        string
  comprador_nome:  string | null
  email_financeiro: string | null
  cidade:          string | null
  estado:          string | null
}

interface RecentOrder {
  id:            string
  order_number:  number
  status:        string
  estimated_total_amount: number
  final_total_amount:     number | null
  created_at:    string
}

interface Props {
  contact:       ChatContact
  customer:      CustomerInfo | null
  recentOrders:  RecentOrder[]
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function ContactSidebar({ contact, customer, recentOrders }: Props) {
  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto shrink-0">
      {/* Contact header */}
      <div className="flex flex-col items-center px-4 pt-6 pb-4 border-b border-slate-100">
        <div className="size-16 rounded-full bg-blue-600 flex items-center justify-center mb-3">
          <span className="text-xl font-bold text-white">
            {(contact.push_name ?? contact.phone_number)?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-900 text-center">
          {contact.push_name ?? formatPhoneDisplay(contact.phone_number)}
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          {formatPhoneDisplay(contact.phone_number)}
        </p>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 justify-center">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Customer info */}
      {customer ? (
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <User className="size-3.5 text-green-600" />
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Cliente Vinculado
              </span>
            </div>
            <Link
              href={`/clientes/${customer.id}`}
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              Abrir <ExternalLink className="size-2.5" />
            </Link>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {customer.nome_fantasia ?? customer.razao_social}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">{customer.cnpj_cpf}</p>
            </div>
            {customer.comprador_nome && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <User className="size-3 text-slate-400 shrink-0" />
                {customer.comprador_nome}
              </div>
            )}
            {customer.email_financeiro && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail className="size-3 text-slate-400 shrink-0" />
                <span className="truncate">{customer.email_financeiro}</span>
              </div>
            )}
            {(customer.cidade || customer.estado) && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="size-3 text-slate-400 shrink-0" />
                {[customer.cidade, customer.estado].filter(Boolean).join(" / ")}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <User className="size-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Contato
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Este contato não está vinculado a nenhum cliente.
          </p>
          <Link
            href="/clientes/novo"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
          >
            <User className="size-3.5" />
            Cadastrar como cliente
          </Link>
        </div>
      )}

      {/* Recent orders */}
      <div className="px-4 py-4 flex-1">
        <div className="flex items-center gap-1.5 mb-3">
          <ShoppingCart className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            Últimos Pedidos
          </span>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum pedido encontrado.</p>
        ) : (
          <div className="space-y-1.5">
            {recentOrders.map((order) => {
              const total = order.final_total_amount ?? order.estimated_total_amount
              return (
                <Link
                  key={order.id}
                  href={`/pedidos/${order.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                      #{String(order.order_number).padStart(4, "0")}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-900 tabular-nums">
                      {BRL(Number(total))}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Tag className="size-3 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Notas
            </span>
          </div>
          <p className="text-xs text-slate-600 whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}
    </div>
  )
}
