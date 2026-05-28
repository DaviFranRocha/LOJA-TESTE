'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCuponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', maxDiscount: '', usageLimit: '', isActive: true, expiresAt: '' });

  useEffect(() => { load(); }, []);
  const load = () => api.get('/coupons').then(r => setCoupons(r.data.data));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/coupons', { ...form, code: form.code.toUpperCase(), discountValue: parseFloat(form.discountValue), minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null, maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null, usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null });
      toast.success('Cupom criado!');
      setShowForm(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao criar cupom'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cupons</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Novo Cupom</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-xs text-gray-400 font-medium uppercase tracking-wide">
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Pedido Mínimo</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3">Expiração</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {coupons.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-blue-600" />
                    <span className="font-mono font-bold text-blue-700">{c.code}</span>
                  </div>
                  {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `R$ ${Number(c.discountValue).toFixed(2)}`}
                  {c.maxDiscount && <p className="text-xs text-gray-400">Máx R$ {Number(c.maxDiscount).toFixed(2)}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.minOrderValue ? `R$ ${Number(c.minOrderValue).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.usageCount}/{c.usageLimit || '∞'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && <div className="text-center py-12 text-gray-400">Nenhum cupom cadastrado</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="font-bold text-lg mb-5">Novo Cupom</h2>
            <form onSubmit={save} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required className="input font-mono" placeholder="FRANCISCO10" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className="input">
                  <option value="PERCENTAGE">Porcentagem (%)</option>
                  <option value="FIXED">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                <input type="number" step="0.01" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pedido Mínimo</label>
                <input type="number" step="0.01" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Máximo</label>
                <input type="number" step="0.01" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} className="input" placeholder="Apenas para %" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Usos</label>
                <input type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} className="input" placeholder="Ilimitado" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiração</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="input" />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2.5">Criar Cupom</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
