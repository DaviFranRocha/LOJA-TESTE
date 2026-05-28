'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle, Download, Package, ArrowRight, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/store/Navbar';

export default function ObrigadoPage() {
  const params  = useSearchParams();
  const router  = useRouter();
  const orderId = params.get('orderId');
  const [order, setOrder]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { router.push('/'); return; }
    api.get(`/orders/${orderId}`)
      .then(r => setOrder(r.data.data))
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const share = async () => {
    try {
      await navigator.share({ title: 'Francis Store', text: 'Acabei de comprar na Francis Store! 🔥', url: window.location.origin });
    } catch {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success('Link copiado!');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#04030a' }}>
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div style={{ background: '#04030a', minHeight: '100vh' }}>
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(52,211,153,0.15),transparent)' }} />

        <div className="max-w-lg mx-auto relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 0 30px rgba(52,211,153,0.2)' }}>
              <CheckCircle size={40} style={{ color: '#34d399' }} />
            </div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "'Syne', sans-serif", color: '#f1effe' }}>
              Compra confirmada! 🎉
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Seu acesso já está liberado.</p>
            {order?.orderNumber && (
              <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-ghost)' }}>
                Pedido #{order.orderNumber}
              </p>
            )}
          </div>

          {order?.items?.length > 0 && (
            <div className="card-elevated mb-4" style={{ padding: '1.25rem' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                Seus produtos
              </h2>
              <div className="space-y-3">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {item.product?.imageUrl && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={item.product.imageUrl} alt={item.productName} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.productName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Qtd: {item.quantity} · R$ {Number(item.totalPrice).toFixed(2)}
                      </p>
                    </div>
                    {item.product?.downloadUrl && (
                      <a href={item.product.downloadUrl} target="_blank" rel="noopener noreferrer"
                        className="btn-primary px-3 py-2 text-xs flex-shrink-0" style={{ borderRadius: 8 }}>
                        <Download size={13} /> Baixar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link href="/meus-produtos" className="btn-primary w-full justify-center" style={{ height: 52, fontSize: 15 }}>
              <Package size={18} /> Ver meus produtos
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={share} className="btn-secondary justify-center" style={{ height: 44, fontSize: 13 }}>
                <Share2 size={14} /> Compartilhar
              </button>
              <Link href="/loja" className="btn-secondary justify-center" style={{ height: 44, fontSize: 13 }}>
                Continuar comprando <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {order?.user?.email && (
            <p className="text-center text-xs mt-6" style={{ color: 'var(--text-ghost)' }}>
              Email de confirmação enviado para <strong style={{ color: 'var(--text-muted)' }}>{order.user.email}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}