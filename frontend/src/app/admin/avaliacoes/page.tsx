'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAvaliacoesPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/reviews');
      setReviews(data.data || []);
    } catch { setReviews([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string, approved: boolean) => {
    try {
      await api.patch(`/admin/reviews/${id}`, { isApproved: approved });
      toast.success(approved ? 'Avaliação aprovada!' : 'Avaliação reprovada');
      setReviews(r => r.map(x => x.id === id ? { ...x, isApproved: approved } : x));
    } catch { toast.error('Erro'); }
  };

  const filtered = filter === 'pending' ? reviews.filter(r => !r.isApproved)
    : filter === 'approved' ? reviews.filter(r => r.isApproved) : reviews;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-black text-gray-900">Avaliações</h1><p className="text-sm text-gray-400 mt-1">Modere as avaliações dos clientes</p></div>
        <div className="flex gap-2">
          {[['all','Todas'],['pending','Pendentes'],['approved','Aprovadas']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter===v ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton rounded-xl h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Star size={40} className="mx-auto mb-3 opacity-30" /><p>Nenhuma avaliação encontrada</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-sm text-gray-900">{r.user?.name}</span>
                    <div className="flex">{[1,2,3,4,5].map(n=><Star key={n} size={12} className={n<=r.rating?'fill-amber-400 text-amber-400':'text-gray-200'} />)}</div>
                    <span className={`badge text-xs ${r.isApproved ? 'badge-green' : 'badge-gray'}`}>{r.isApproved ? 'Aprovada' : 'Pendente'}</span>
                  </div>
                  <p className="text-xs text-purple-600 mb-1">{r.product?.name}</p>
                  {r.title && <p className="font-semibold text-sm text-gray-800">{r.title}</p>}
                  {r.body  && <p className="text-sm text-gray-600 mt-0.5">{r.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!r.isApproved && (
                    <button onClick={() => approve(r.id, true)} className="p-2 rounded-xl hover:bg-green-50 text-green-600" title="Aprovar"><CheckCircle size={16} /></button>
                  )}
                  {r.isApproved && (
                    <button onClick={() => approve(r.id, false)} className="p-2 rounded-xl hover:bg-red-50 text-red-400" title="Reprovar"><XCircle size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
