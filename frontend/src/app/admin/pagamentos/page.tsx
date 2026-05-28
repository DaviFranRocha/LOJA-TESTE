'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CreditCard, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:    { bg: '#fef9c3', color: '#854d0e', label: 'Pendente' },
  PROCESSING: { bg: '#dbeafe', color: '#1e40af', label: 'Processando' },
  APPROVED:   { bg: '#dcfce7', color: '#166534', label: 'Aprovado' },
  REJECTED:   { bg: '#fee2e2', color: '#dc2626', label: 'Rejeitado' },
  REFUNDED:   { bg: '#f3f4f6', color: '#6b7280', label: 'Reembolsado' },
  CANCELLED:  { bg: '#fee2e2', color: '#dc2626', label: 'Cancelado' },
};

export default function AdminPagamentosPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '100' });
      if (search) p.set('search', search);
      const { data } = await api.get(`/orders/all?${p}`);
      setOrders(data.data.filter((o: any) => o.payment));
    } catch { toast.error('Erro'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const confirm = async (orderId: string) => {
    try {
      await api.post(`/payments/${orderId}/confirm`, {});
      toast.success('Pagamento confirmado!');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro'); }
  };

  const stats = {
    total: orders.reduce((s, o) => s + (o.payment?.status === 'APPROVED' ? Number(o.total) : 0), 0),
    pending: orders.filter(o => o.payment?.status === 'PENDING').length,
    approved: orders.filter(o => o.payment?.status === 'APPROVED').length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-black text-gray-900">Pagamentos</h1><p className="text-sm text-gray-400 mt-1">Gerencie e confirme pagamentos</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Receita Aprovada', value: `R$ ${stats.total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, color: 'text-green-600', bg: '#f0fdf4' },
          { label: 'Aguardando',       value: stats.pending,   color: 'text-orange-600', bg: '#fff7ed' },
          { label: 'Aprovados',        value: stats.approved,  color: 'text-purple-700', bg: '#faf5ff' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ background: s.bg }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter'&&load()}
            placeholder="Buscar pedido..." className="input pl-9 text-sm" />
        </div>
        <button onClick={load} className="btn-secondary text-sm px-4">Buscar</button>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton rounded-xl h-14" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Pedido</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Método</th>
                <th className="px-5 py-3.5">Valor</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => {
                const pay = o.payment;
                const st  = STATUS_STYLE[pay?.status] || STATUS_STYLE.PENDING;
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-purple-700">{o.orderNumber}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{o.user?.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge badge-purple text-xs">{pay?.method || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 font-black text-purple-700">R$ {Number(o.total).toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3.5">
                      {pay?.status === 'PENDING' && (
                        <button onClick={() => confirm(o.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-green-200">
                          <CheckCircle size={13} /> Confirmar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && <div className="text-center py-16 text-gray-400"><CreditCard size={40} className="mx-auto mb-3 opacity-30" /><p>Nenhum pagamento</p></div>}
        </div>
      )}
    </div>
  );
}
