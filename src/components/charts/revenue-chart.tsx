"use client"

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

interface DataPoint {
  dia:     string
  receita: number
}

interface Props {
  data: DataPoint[]
}

const formatDay = (day: string) =>
  new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

const formatY = (value: number) => {
  if (value === 0) return ""
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`
  return `R$ ${value.toFixed(0)}`
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-card px-3 py-2">
      <p className="text-[11px] text-slate-400 mb-0.5">{formatDay(label)}</p>
      <p className="text-sm font-bold text-slate-900 tabular-nums">{BRL(payload[0].value)}</p>
    </div>
  )
}

export function RevenueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

        <XAxis
          dataKey="dia"
          tickFormatter={(v, i) => i % 5 === 0 ? formatDay(v) : ""}
          tick={{ fill: "#94A3B8", fontSize: 11 }}
          axisLine={false} tickLine={false}
        />

        <YAxis
          tickFormatter={formatY}
          tick={{ fill: "#94A3B8", fontSize: 11 }}
          axisLine={false} tickLine={false}
          width={56}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />

        <Area
          type="monotone"
          dataKey="receita"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#blueGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#2563EB", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
