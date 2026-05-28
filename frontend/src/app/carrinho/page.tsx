'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Download, AlertTriangle } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const { items, removeItem, updateQty, clear } = useCartStore();
  const user   = useAuthStore(s => s.user);
  const router = useRouter();

  const [productMap, setProductMap] = useState<Record<string, any>>({});
  const [fetching, setFetching]     = useState<Record<string, boolean>>({});
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount]     = useState(0);
  const [couponObj, setCouponObj]   = useState<any>(null);
  const [applying, setApplying]     = useState(false);

  const fetchProduct = useCallback(async (productId: string) => {
    if (productMap[productId] !== undefined || fetching[productId]) return;
    setFetching(prev => ({ ...prev, [productId]: true }));
    try {
      const { data } = await api.get(`/products/id/${productId}`);
      setProductMap(prev => ({ ...prev, [productId]: data.data }));
    } catch {
      setProductMap(prev => ({ ...prev, [productId]: null }));
    } finally {
      setFetching(prev => ({ ...prev, [productId]: false }));
    }
  }, [productMap, fetching]);

  useEffect(() => { items.forEach(item => fetchProduct(item.productId)); }, [items.length]);

  const subtotal = items.reduce((sum, item) => {
    const p = productMap[item.productId];
    return sum + (p ? Number(p.price) * item.quantity : 0);
  }, 0);
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode, orderValue: subtotal });
      setCouponObj(data.data);
      setDiscount(Number(data.data.discount));
      toast.success(`Cupom aplicado! −R$ ${Number(data.data.discount).toFixed(2)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cupom inválido');
    } finally { setApplying(false); }
  };

  const handleCheckout = () => {
    if (!user) { toast.error('Faça login para continuar'); router.push('/auth/login'); return; }
    const validItems = items.filter(item => productMap[item.productId] !== null);
    if (!validItems.length) { toast.error('Carrinho sem produtos disponíveis'); return; }
    // Salva cupom no sessionStorage para o checkout usar
    if (couponObj) {
      sessionStorage.setItem('appliedCoupon', JSON.stringify({ code: couponObj.code, discount }));
    } else {
      sessionStorage.removeItem('appliedCoupon');
    }
    router.push('/checkout');
  };

  if (!items.length) return (
    <>
      <Navbar />
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <ShoppingBag size={32} style={{ color: 'var(--violet-500)' }} />
        </div>
        <h1 className="text-2xl font-black mb-3" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
          Seu carrinho está vazio
        </h1>
        <p className="mb-8 max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
          Explore nossos produtos digitais e adicione ao carrinho.
        </p>
        <Link href="/loja" className="btn-primary px-8 py-3">Ver Produtos</Link>
      </div>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
            Carrinho <span className="text-gradient">({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => {
              const p = productMap[item.productId];
              const isLoading = fetching[item.productId];
              const notFound  = p === null && !isLoading;

              return (
                <div key={item.productId}
                  className="card flex gap-4 items-start"
                  style={{ borderColor: notFound ? 'rgba(248,113,113,0.2)' : 'var(--border)', background: notFound ? 'rgba(239,68,68,0.04)' : 'var(--surface)' }}>
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {isLoading ? <div className="skeleton w-full h-full" />
                    : p?.images?.[0]?.url ? (
                      <Image src={p.images[0].url} alt={p.name} fill className="object-cover" unoptimized />
                    ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    {isLoading ? (
                      <div className="space-y-2"><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-3 w-1/2 rounded" /></div>
                    ) : notFound ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#f87171' }}>Produto não disponível</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Este produto foi removido ou está inativo</p>
                        </div>
                      </div>
                    ) : p ? (
                      <>
                        <Link href={`/produto/${p.slug}`}
                          className="font-semibold text-sm line-clamp-2 block mb-1 transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                          onMouseEnter={e => (e.currentTarget as any).style.color = '#c4b5fd'}
                          onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-primary)'}>
                          {p.name}
                        </Link>
                        <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--violet-500)' }}>
                          <Download size={11} /> Produto Digital
                        </div>
                        <p className="font-black text-lg" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>
                          R$ {(Number(p.price) * item.quantity).toFixed(2)}
                        </p>
                        {item.quantity > 1 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>R$ {Number(p.price).toFixed(2)} cada</p>}
                      </>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <button onClick={() => removeItem(item.productId)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-ghost)' }}
                      onMouseEnter={e => { (e.currentTarget as any).style.color = '#f87171'; (e.currentTarget as any).style.background = 'rgba(248,113,113,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-ghost)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                      <Trash2 size={15} />
                    </button>
                    {!notFound && (
                      <div className="flex items-center rounded-xl overflow-hidden"
                        style={{ border: '1px solid var(--border)' }}>
                        <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="px-2.5 py-1.5 transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget as any).style.background = 'var(--surface-2)'}
                          onMouseLeave={e => (e.currentTarget as any).style.background = 'transparent'}>
                          <Minus size={13} />
                        </button>
                        <span className="px-3 py-1.5 font-bold text-sm min-w-[36px] text-center"
                          style={{ color: 'var(--text-primary)' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="px-2.5 py-1.5 transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget as any).style.background = 'var(--surface-2)'}
                          onMouseLeave={e => (e.currentTarget as any).style.background = 'transparent'}>
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {items.some(i => productMap[i.productId] === null) && (
              <button onClick={() => { items.filter(i => productMap[i.productId] === null).forEach(i => removeItem(i.productId)); toast.success('Itens indisponíveis removidos'); }}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: '#f87171' }}>
                <Trash2 size={13} /> Remover itens indisponíveis
              </button>
            )}
            <button onClick={() => { clear(); toast.success('Carrinho limpo'); }}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget as any).style.color = '#f87171'}
              onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-muted)'}>
              <Trash2 size={13} /> Limpar carrinho
            </button>
          </div>

          {/* Summary */}
          <div className="card-elevated h-fit space-y-4">
            <h2 className="font-black text-lg" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Resumo</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map(item => {
                const p = productMap[item.productId];
                return p ? (
                  <div key={item.productId} className="flex justify-between text-xs gap-2">
                    <span className="line-clamp-1 flex-1" style={{ color: 'var(--text-muted)' }}>{p.name} ×{item.quantity}</span>
                    <span className="font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>R$ {(Number(p.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="divider" />
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span style={{ color: 'var(--text-secondary)' }}>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#34d399' }}>Desconto</span>
                <span style={{ color: '#34d399' }}>−R$ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Entrega</span>
              <span className="font-semibold" style={{ color: '#34d399' }}>Digital — Grátis ✓</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between font-black text-xl pt-1">
              <span style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Total</span>
              <span className="text-gradient" style={{ fontFamily: "'Syne', sans-serif" }}>R$ {total.toFixed(2)}</span>
            </div>

            {/* Coupon */}
            {!couponObj ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder="Cupom de desconto" className="input pl-8 text-sm py-2" />
                </div>
                <button onClick={applyCoupon} disabled={applying} className="btn-secondary px-3 text-sm disabled:opacity-50">
                  {applying ? '...' : 'OK'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#34d399' }}>
                  <Tag size={13} />{couponObj.code}
                </span>
                <button onClick={() => { setCouponObj(null); setCouponCode(''); setDiscount(0); }}
                  style={{ color: '#34d399' }}
                  onMouseEnter={e => (e.currentTarget as any).style.color = '#f87171'}
                  onMouseLeave={e => (e.currentTarget as any).style.color = '#34d399'}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            <button onClick={handleCheckout} className="btn-primary w-full py-4 text-base font-black rounded-xl">
              Finalizar Compra <ArrowRight size={18} />
            </button>
            <Link href="/loja" className="block text-center text-sm font-medium transition-colors"
              style={{ color: 'var(--violet-500)' }}
              onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--violet-400)'}
              onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--violet-500)'}>
              ← Continuar comprando
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}