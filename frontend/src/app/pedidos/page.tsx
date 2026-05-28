'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import { Package, ShoppingBag, Clock, CreditCard, Smartphone, FileText, CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronRight, Calendar, Hash } from 'lucide-react';

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PENDING:         { label: 'Pendente',          color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  icon: Clock },
  PAYMENT_PENDING: { label: 'Aguard. Pagamento', color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  icon: AlertCircle },
  PAID:            { label: 'Pago',              color: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.25)',  icon: CheckCircle },
  PROCESSING:      { label: 'Processando',       color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.25)', icon: RefreshCw },
  DELIVERED:       { label: 'Entregue',          color: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.25)',  icon: CheckCircle },
  CANCELLED:       { label: 'Cancelado',         color: '#f87171', bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.25)', icon: XCircle },
  REFUNDED:        { label: 'Reembolsado',       color: '#9ca3af', bg: 'rgba(156,163,175,0.08)',  border: 'rgba(156,163,175,0.25)', icon: RefreshCw },
};

const METHOD_ICON: Record<string, any> = {
  PIX: Smartphone, STRIPE: CreditCard, CREDIT_CARD: CreditCard, BOLETO: FileText,
};
const METHOD_LABEL: Record<string, string> = {
  PIX: 'PIX', STRIPE: 'Cartão', CREDIT_CARD: 'Cartão', BOLETO: 'Boleto',
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function OrdersPage() {
  const user   = useAuthStore(s => s.user);
  const router = useRouter();
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    api.get('/orders?limit=50').then(r => setOrders(r.data.data)).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
              Meus <span className="text-gradient">Pedidos</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(196,181,253,0.7)' }}>
              {orders.length} pedido{orders.length !== 1 ? 's' : ''} no total
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-bright)' }}>
            <ShoppingBag size={22} style={{ color: 'var(--violet-400)' }} />
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <ShoppingBag size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Nenhum pedido ainda</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Explore nossos produtos e faça sua primeira compra!</p>
            <Link href="/loja" className="btn-primary px-8 py-3">Explorar Produtos</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const st      = STATUS[order.status] || { label: order.status, color: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--border)', icon: Package };
              const Icon    = st.icon;
              const method  = order.payment?.method;
              const MIcon   = method ? METHOD_ICON[method] : null;
              const isPaid  = ['PAID','DELIVERED'].includes(order.status);
              const items   = order.items || [];

              return (
                <Link key={order.id} href={`/pedidos/${order.id}`}
                  className="block group"
                  style={{
                    background: 'var(--surface-1)',
                    border: `1px solid ${isPaid ? 'rgba(52,211,153,0.15)' : 'var(--border)'}`,
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as any).style.borderColor = isPaid ? 'rgba(52,211,153,0.5)' : 'rgba(167,139,250,0.5)'; (e.currentTarget as any).style.boxShadow = `0 4px 24px ${isPaid ? 'rgba(52,211,153,0.1)' : 'rgba(139,92,246,0.15)'}`; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.borderColor = isPaid ? 'rgba(52,211,153,0.3)' : 'rgba(139,92,246,0.2)'; (e.currentTarget as any).style.boxShadow = 'none'; }}>

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                        <Icon size={18} style={{ color: st.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold" style={{ color: '#e2d9f3' }}>
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                            {st.label}
                          </span>
                        </div>
                        {/* Date + time */}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(196,181,253,0.6)' }}>
                            <Calendar size={10} />
                            {fmt(order.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(196,181,253,0.6)' }}>
                            <Clock size={10} />
                            {fmtTime(order.createdAt)}
                          </span>
                          {MIcon && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(196,181,253,0.6)' }}>
                              <MIcon size={10} />
                              {METHOD_LABEL[method]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-lg font-black" style={{ color: isPaid ? '#34d399' : 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>
                        R$ {Number(order.total).toFixed(2)}
                      </span>
                      <ChevronRight size={16} style={{ color: 'var(--text-ghost)' }} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Products preview */}
                  {items.length > 0 ? (
                    <div className="flex items-center gap-2" style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
                      <div className="flex -space-x-2">
                        {items.slice(0, 4).map((item: any, i: number) => (
                          <div key={i} className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                            style={{ border: '2px solid var(--surface-1)', background: 'var(--surface-2)', zIndex: 4 - i }}>
                            {item.productImg || item.product?.images?.[0]?.url ? (
                              <Image src={item.productImg || item.product.images[0].url} alt={item.productName} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={14} style={{ color: 'var(--text-ghost)' }} />
                              </div>
                            )}
                          </div>
                        ))}
                        {items.length > 4 && (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--surface-3)', border: '2px solid var(--surface-1)', color: 'var(--text-muted)' }}>
                            +{items.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'rgba(226,217,243,0.85)' }}>
                          {items.map((i: any) => i.productName).join(', ')}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.55)' }}>
                          {items.length} produto{items.length !== 1 ? 's' : ''}
                          {isPaid && order.payment?.paidAt && (
                            <> · Pago em {fmt(order.payment.paidAt)} às {fmtTime(order.payment.paidAt)}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Detalhes do pedido</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}