"use client"

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts"

interface DataPoint {
  date:            string
  entradas:        number
  saidas:          number
  previsto_in:     number
  previsto_out:    number
  saldo_projetado: number
}

const BRL_SHORT = (v: number) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
  return v.toFixed(0)
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const SHORT_DATE = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

export function CashFlowChart({ data, today }: { data: DataPoint[]; today: string }) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={SHORT_DATE}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            tickFormatter={BRL_SHORT}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || !label) return null
              const d = new Date(label + "T12:00:00")
              return (
                <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-3 text-xs">
                  <p className="font-semibold text-slate-900 mb-1.5">
                    {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  {payload.map((p: any) => (
                    <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-600">{p.name}:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">{BRL(Number(p.value))}</span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            iconType="circle"
          />
          <ReferenceLine x={today} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Hoje", position: "top", fontSize: 10, fill: "#64748b" }} />
          <ReferenceLine y={0} stroke="#cbd5e1" />

          <Bar dataKey="entradas"     name="Entradas (realizadas)" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={6} />
          <Bar dataKey="previsto_in"  name="Previsto a receber"     fill="#bbf7d0" radius={[4, 4, 0, 0]} barSize={6} />
          <Bar dataKey="saidas"       name="Saídas (realizadas)"   fill="#dc2626" radius={[4, 4, 0, 0]} barSize={6} />
          <Bar dataKey="previsto_out" name="Previsto a pagar"       fill="#fecaca" radius={[4, 4, 0, 0]} barSize={6} />

          <Line
            type="monotone"
            dataKey="saldo_projetado"
            name="Saldo projetado"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
