'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import { Download, Clock, Package, ExternalLink, Lock, CheckCircle, AlertTriangle, Sparkles, Calendar, Hash, Star } from 'lucide-react';
import toast from 'react-hot-toast';

function TimeBar({ daysLeft, hoursLeft }: { daysLeft: number; hoursLeft: number | null }) {
  const total = 5;
  const remaining = hoursLeft !== null ? hoursLeft / 24 : daysLeft;
  const pct = Math.min(100, Math.max(0, (remaining / total) * 100));
  const color = pct > 50 ? '#34d399' : pct > 20 ? '#fbbf24' : '#f87171';
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-3)' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.5s', borderRadius: 9999 }} />
    </div>
  );
}

export default function MeusProdutosPage() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const [accesses, setAccesses] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    api.get('/access')
      .then(r => setAccesses(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar produtos'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDownload = (access: any) => {
    const url = access.product.downloadUrl;
    if (!url) { toast('Link de download não configurado. Entre em contato com o suporte.', { icon: 'ℹ️' }); return; }
    window.open(url, '_blank');
    toast.success('Download iniciado! 🎉');
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
              Meus <span className="text-gradient">Produtos</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {accesses.length} produto{accesses.length !== 1 ? 's' : ''} disponível{accesses.length !== 1 ? 'is' : ''}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-bright)' }}>
            <Download size={22} style={{ color: 'var(--violet-400)' }} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
          </div>
        ) : accesses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Package size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Nenhum produto disponível</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Seus produtos aparecerão aqui após a confirmação do pagamento</p>
            <Link href="/loja" className="btn-primary px-8 py-3">Explorar Produtos</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {accesses.map(access => {
              const img        = access.product.images?.[0]?.url;
              const hasDownload = !!access.product.downloadUrl;
              const isUrgent   = access.hoursLeft !== null;
              const isExpiring = access.daysLeft <= 1;
              const timeLabel  = isUrgent
                ? `${access.hoursLeft}h restantes`
                : `${access.daysLeft} dia${access.daysLeft !== 1 ? 's' : ''} restante${access.daysLeft !== 1 ? 's' : ''}`;
              const paidAt = access.paidAt ? new Date(access.paidAt) : null;

              return (
                <div key={access.orderItemId}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(20,18,40,0.95) 100%)',
                    border: `1.5px solid ${isExpiring ? 'rgba(251,191,36,0.3)' : 'rgba(139,92,246,0.2)'}`,
                    boxShadow: isExpiring ? '0 0 20px rgba(251,191,36,0.05)' : 'none',
                  }}>

                  {/* Top section */}
                  <div className="flex gap-4 p-5">
                    {/* Image */}
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      {img ? (
                        <img src={img} alt={access.product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                      {/* Status badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(52,211,153,0.9)', color: '#022c22', fontSize: 10 }}>
                          <CheckCircle size={9} /> Pago
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base mb-1 leading-tight" style={{ fontFamily: "'Syne', sans-serif", color: '#e2d9f3' }}>
                        {access.product.name}
                      </h3>

                      {access.product.shortDesc && (
                        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(196,181,253,0.6)' }}>
                          {access.product.shortDesc}
                        </p>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="flex items-center gap-1" style={{ color: 'rgba(196,181,253,0.55)' }}>
                          <Hash size={10} />
                          {access.orderNumber}
                        </span>
                        {paidAt && (
                          <span className="flex items-center gap-1" style={{ color: 'rgba(196,181,253,0.55)' }}>
                            <Calendar size={10} />
                            Pago em {paidAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} às {paidAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="flex items-center gap-1"
                          style={{ color: isExpiring ? '#fbbf24' : 'rgba(196,181,253,0.55)' }}>
                          <Clock size={10} />
                          {timeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0 justify-center">
                      <button onClick={() => handleDownload(access)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all"
                        style={{
                          background: hasDownload ? 'var(--grad-neon)' : 'var(--surface-3)',
                          color: hasDownload ? 'white' : 'var(--text-muted)',
                          boxShadow: hasDownload ? '0 4px 20px rgba(139,92,246,0.4)' : 'none',
                          border: hasDownload ? 'none' : '1px solid var(--border)',
                          cursor: hasDownload ? 'pointer' : 'not-allowed',
                          fontFamily: "'Syne', sans-serif",
                          minWidth: 110,
                          justifyContent: 'center',
                        }}>
                        {hasDownload ? <><Download size={14} /> Acessar</> : <><Lock size={13} /> Em breve</>}
                      </button>
                      <Link href={`/produto/${access.product.slug}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all justify-center"
                        style={{ color: 'rgba(196,181,253,0.6)', border: '1px solid rgba(139,92,246,0.15)' }}
                        onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'rgba(139,92,246,0.4)'; (e.currentTarget as any).style.color = '#c4b5fd'; }}
                        onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'rgba(139,92,246,0.15)'; (e.currentTarget as any).style.color = 'rgba(196,181,253,0.6)'; }}>
                        <ExternalLink size={11} /> Ver produto
                      </Link>
                    </div>
                  </div>

                  {/* Time bar */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>
                        Expira em {new Date(access.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {isExpiring && (
                        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#fbbf24' }}>
                          <AlertTriangle size={11} /> Expirando em breve
                        </span>
                      )}
                    </div>
                    <TimeBar daysLeft={access.daysLeft} hoursLeft={access.hoursLeft} />
                  </div>
                </div>
              );
            })}

            {/* Info */}
            <div className="mt-4 p-4 rounded-2xl flex items-start gap-3"
              style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
              <Sparkles size={15} style={{ color: 'var(--violet-400)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.5)' }}>
                <strong style={{ color: 'rgba(196,181,253,0.8)' }}>Sobre o acesso:</strong> Seus produtos ficam disponíveis por até 5 dias após a compra. Após esse período entre em contato pelo suporte para renovar.
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}