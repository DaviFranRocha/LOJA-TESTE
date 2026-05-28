'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Edit, Trash2, X, ShoppingBag, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['PENDING','PAYMENT_PENDING','PAID','PROCESSING','DELIVERED','CANCELLED','REFUNDED'];
const STATUS_LABELS: Record<string, string> = {
  PENDING:'Pendente', PAYMENT_PENDING:'Ag. Pagamento', PAID:'Pago',
  PROCESSING:'Processando', DELIVERED:'Entregue',
  CANCELLED:'Cancelado', REFUNDED:'Reembolsado',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:         { bg: '#fef9c3', color: '#854d0e' },
  PAYMENT_PENDING: { bg: '#ffedd5', color: '#9a3412' },
  PAID:            { bg: '#dcfce7', color: '#166534' },
  PROCESSING:      { bg: '#dbeafe', color: '#1e40af' },
  DELIVERED:       { bg: '#f0fdf4', color: '#15803d' },
  CANCELLED:       { bg: '#fee2e2', color: '#dc2626' },
  REFUNDED:        { bg: '#f3f4f6', color: '#6b7280' },
};

export default function AdminOrdersPage() {
  const [orders, setOrders]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('');
  const [editing, setEditing]         = useState<any>(null);
  const [newStatus, setNewStatus]     = useState('');
  const [trackingCode, setTracking]   = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '50' });
      if (search) p.set('search', search);
      if (filter) p.set('status', filter);
      const { data } = await api.get(`/orders/all?${p}`);
      setOrders(data.data);
    } catch { toast.error('Erro ao carregar pedidos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const openEdit = (order: any) => {
    setEditing(order);
    setNewStatus(order.status);
    setTracking(order.trackingCode || '');
  };

  const updateStatus = async () => {
    try {
      await api.patch(`/orders/${editing.id}/status`, {
        status: newStatus,
        comment: `Status atualizado para ${STATUS_LABELS[newStatus]}`,
        ...(trackingCode && { trackingCode }),
      });
      toast.success('Pedido atualizado!');
      setEditing(null);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao atualizar'); }
  };

  // Real DELETE using the new route
  const deleteOrder = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${confirmDelete.id}`);
      toast.success('Pedido excluído com sucesso!');
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao excluir pedido');
    } finally { setDeleting(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Pedidos</h1>
        <span className="text-sm text-gray-400">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Buscar pedido ou cliente..." className="input pl-9 text-sm w-72" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input w-auto text-sm">
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={load} className="btn-secondary text-sm px-4">Filtrar</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-xl h-14" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Pedido</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Itens</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Pgto</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => {
                const sc = STATUS_COLORS[o.status] || { bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-purple-700">{o.orderNumber}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 text-sm">{o.user?.name}</p>
                      <p className="text-xs text-gray-400">{o.user?.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-sm">{o._count?.items}</td>
                    <td className="px-5 py-3.5 font-black text-purple-700">R$ {Number(o.total).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{o.payment?.method || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: sc.bg, color: sc.color }}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(o)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors" title="Editar status">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(o)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Excluir pedido">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum pedido encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT STATUS MODAL ────────────────────────── */}
      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg text-gray-900">Atualizar Pedido</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={17} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Pedido: <strong className="text-purple-700 font-mono">{editing.orderNumber}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Novo Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Código / Link de Acesso <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input value={trackingCode} onChange={e => setTracking(e.target.value)}
                  className="input" placeholder="Link de download ou código de acesso" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={updateStatus} className="btn-primary flex-1 py-2.5 font-bold">Salvar</button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ─────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Excluir Pedido?</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-center">
              <p className="font-mono font-bold text-purple-700 text-lg">{confirmDelete.orderNumber}</p>
              <p className="text-sm text-gray-500 mt-1">Cliente: <strong>{confirmDelete.user?.name}</strong></p>
              <p className="text-sm font-bold text-gray-700 mt-1">R$ {Number(confirmDelete.total).toFixed(2)}</p>
            </div>
            <p className="text-sm text-gray-500 text-center mb-6">
              Esta ação é <strong className="text-red-500">permanente</strong> e não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={deleteOrder} disabled={deleting}
                className="btn-danger flex-1 py-3 font-black disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="btn-secondary flex-1 py-3">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
