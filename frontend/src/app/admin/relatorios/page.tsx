'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

export default function AdminReportsPage() {
  const [data, setData]   = useState<any>(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/financial-report?period=${period}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatório Financeiro</h1>
        <div className="flex gap-2">
          {[['7d','7 dias'],['30d','30 dias'],['90d','90 dias'],['1y','1 ano']].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {data?.revenue?.length > 0 && (() => {
            const totalRev  = data.revenue.reduce((s: number, r: any) => s + (r.revenue || 0), 0);
            const totalDisc = data.revenue.reduce((s: number, r: any) => s + (r.discounts || 0), 0);
            const totalOrd  = data.revenue.reduce((s: number, r: any) => s + (r.orders || 0), 0);
            const avg       = totalOrd ? totalRev / totalOrd : 0;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Receita Total', value: `R$ ${totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-green-600' },
                  { label: 'Pedidos',       value: totalOrd, color: 'text-blue-600' },
                  { label: 'Ticket Médio',  value: `R$ ${avg.toFixed(2)}`, color: 'text-purple-600' },
                  { label: 'Descontos',     value: `R$ ${totalDisc.toFixed(2)}`, color: 'text-orange-600' },
                ].map((c, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">{c.label}</p>
                    <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Revenue over time */}
          {data?.revenue?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold mb-4">Receita ao Longo do Tempo</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.revenue}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5) || d} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Receita" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By payment method */}
            {data?.byMethod?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-bold mb-4">Por Método de Pagamento</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.byMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                      {data.byMethod.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top categories */}
            {data?.topCategories?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-bold mb-4">Top Categorias</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.topCategories} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Refunds */}
          {data?.refunds && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold mb-3">Reembolsos</h2>
              <div className="flex gap-6 text-sm">
                <div><span className="text-gray-500">Quantidade:</span> <strong>{data.refunds.count}</strong></div>
                <div><span className="text-gray-500">Total reembolsado:</span> <strong className="text-red-600">R$ {Number(data.refunds.total).toFixed(2)}</strong></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
