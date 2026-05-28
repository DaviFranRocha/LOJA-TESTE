'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Star, Shield, ArrowLeft, Plus, Minus, Download, Zap, Check, Clock, Users, ChevronDown, ChevronUp, CheckCircle, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore, useWishlistStore, useAuthStore } from '@/lib/store';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';

// ── Sticky Buy Button ────────────────────────────────────────────
function StickyBuy({ product, qty, onBuy, onCart }: any) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
      style={{ background: 'rgba(4,3,10,0.95)', borderTop: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate" style={{ fontFamily: "'Syne', sans-serif", color: '#e2d9f3' }}>{product.name}</p>
          <p className="font-black text-lg" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>R$ {Number(product.price).toFixed(2)}</p>
        </div>
        <button onClick={onCart} className="btn-secondary px-4 py-2.5 text-sm flex-shrink-0">
          <ShoppingCart size={15} />
        </button>
        <button onClick={onBuy} disabled={product.stock === 0}
          className="btn-primary px-6 py-2.5 text-sm flex-shrink-0 font-black"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          {product.stock === 0 ? 'Sem Estoque' : '⚡ Comprar Agora'}
        </button>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { slug }   = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty]         = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [showDesc, setShowDesc]   = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon]         = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const addItem  = useCartStore(s => s.addItem);
  const router   = useRouter();
  const { ids, toggle } = useWishlistStore();
  const user = useAuthStore(s => s.user);
  const isLiked = product ? ids.includes(product.id) : false;

  const handleFav = async () => {
    if (!user) { toast.error('Faça login para salvar favoritos'); return; }
    if (!product) return;
    toggle(product.id);
    try { await api.post('/wishlist/toggle', { productId: product.id }); } catch {}
    toast.success(ids.includes(product.id) ? 'Removido dos favoritos' : '❤️ Adicionado aos favoritos!');
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const price = Number(product?.price || 0);
      const { data } = await api.post('/coupons/validate', { code: couponCode.toUpperCase(), orderValue: price });
      setCoupon({ code: couponCode.toUpperCase(), discount: Number(data.data.discount) });
      sessionStorage.setItem('appliedCoupon', JSON.stringify({ code: couponCode.toUpperCase(), discount: Number(data.data.discount) }));
      toast.success(`Cupom aplicado! −R$ ${Number(data.data.discount).toFixed(2)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cupom inválido');
    } finally { setCouponLoading(false); }
  };


  const getCategoryHref = (slug: string) => {
    const map: Record<string, string> = {
      cursos:   '/ferramentas',
      ebooks:   '/ebooks',
      jogos:    '/jogos',
      produtos: '/loja',
    };
    return map[slug] || `/loja`;
  };
  const finalPrice = coupon ? Math.max(0, Number(product?.price || 0) - coupon.discount) : Number(product?.price || 0);

  useEffect(() => {
    api.get(`/products/${slug}`)
      .then(r => setProduct(r.data.data))
      .catch(() => toast.error('Produto não encontrado'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="skeleton rounded-2xl h-96" />
          <div className="space-y-4">{[...Array(6)].map((_,i) => <div key={i} className="skeleton rounded h-8" />)}</div>
        </div>
      </div>
      <Footer />
    </>
  );

  if (!product) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">😕</p>
        <h1 className="text-2xl font-black mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Produto não encontrado</h1>
        <Link href="/loja" className="btn-primary">Ver todos os produtos</Link>
      </div>
      <Footer />
    </>
  );

  const disc     = product.comparePrice ? Math.round((1 - Number(product.price)/Number(product.comparePrice))*100) : 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const avgRating  = product.avgRating || 0;

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-6 flex-wrap" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="transition-colors hover:text-violet-400">Home</Link>
          <span>/</span>
          <Link href="/loja" className="transition-colors hover:text-violet-400">Produtos</Link>
          {product.category && (<><span>/</span><Link href={getCategoryHref(product.category.slug)} className="transition-colors hover:text-violet-400">{product.category.slug === 'cursos' ? 'Ferramentas' : product.category.name}</Link></>)}
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }} className="line-clamp-1">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* ── Images ── */}
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {product.images?.[activeImg]?.url ? (
                <Image src={product.images[activeImg].url} alt={product.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
              )}
              {disc > 0 && (
                <span className="absolute top-4 left-4 text-white font-black px-3 py-1.5 rounded-full text-sm"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', fontFamily: "'Syne', sans-serif" }}>
                  -{disc}% OFF
                </span>
              )}
              {/* Sold badge */}
              {product.totalSold > 0 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(4,3,10,0.85)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', backdropFilter: 'blur(8px)' }}>
                  <CheckCircle size={11} style={{ color: '#34d399' }} />
                  {product.totalSold}+ pessoas já compraram
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img: any, i: number) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all"
                    style={{ border: `2px solid ${i === activeImg ? 'var(--violet-500)' : 'var(--border)'}` }}>
                    <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div>
            {product.category && (
              <Link href={getCategoryHref(product.category.slug)}
                className="text-xs font-bold uppercase tracking-wider transition-colors"
                style={{ color: 'var(--violet-500)', fontFamily: "'Syne', sans-serif" }}>
                {product.category.name}
              </Link>
            )}
            <h1 className="text-2xl font-black mt-2 mb-3 leading-tight"
              style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              {product.name}
            </h1>

            {/* Rating + sold */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={15} style={{ fill: n <= Math.round(avgRating) ? '#fbbf24' : 'var(--surface-3)', color: n <= Math.round(avgRating) ? '#fbbf24' : 'var(--surface-3)' }} />
                ))}
                <span className="text-sm ml-1 font-bold" style={{ color: '#fbbf24' }}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
              </div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>({product.totalReviews || 0} avaliações)</span>
              {product.totalSold > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
                  style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--violet-400)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Flame size={11} /> {product.totalSold}+ vendidos
                </span>
              )}
            </div>

            {/* Price box */}
            <div className="mb-5 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(30,27,50,0.8))', border: '1.5px solid rgba(139,92,246,0.2)' }}>
              {product.comparePrice && (
                <p className="line-through text-base" style={{ color: 'var(--text-ghost)' }}>R$ {Number(product.comparePrice).toFixed(2)}</p>
              )}
              <p className="text-4xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--violet-400)' }}>
                R$ {Number(product.price).toFixed(2)}
              </p>
              {disc > 0 && (
                <p className="text-sm font-semibold mt-1" style={{ color: '#34d399' }}>
                  💰 Você economiza R$ {(Number(product.comparePrice) - Number(product.price)).toFixed(2)}
                </p>
              )}
            </div>

            {/* Urgency badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {isLowStock && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                  ⚡ Apenas {product.stock} restantes!
                </div>
              )}
              {product.stock === 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                  ❌ Sem estoque
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                ✅ Acesso imediato
              </div>
            </div>

            {product.shortDesc && (
              <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>
                {product.shortDesc}
              </p>
            )}

            {/* Qty */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Quantidade:</span>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button onClick={() => setQty(q => Math.max(1, q-1))} className="px-3 py-2 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget as any).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as any).style.background = 'transparent'}>
                  <Minus size={15} />
                </button>
                <span className="px-4 py-2 font-bold min-w-[40px] text-center" style={{ color: 'var(--text-primary)' }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q+1))} className="px-3 py-2 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget as any).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as any).style.background = 'transparent'}>
                  <Plus size={15} />
                </button>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.stock} disponíveis</span>
            </div>

            {/* ── Coupon ── */}
            <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.04)' }}>
              <div className="flex items-center gap-2 p-3">
                <span className="text-base">🏷️</span>
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                  placeholder="Tem um cupom de desconto?"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: '#e2d9f3', fontFamily: "'DM Sans', sans-serif" }}
                  disabled={!!coupon}
                />
                {coupon ? (
                  <button onClick={() => { setCoupon(null); setCouponCode(''); sessionStorage.removeItem('appliedCoupon'); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    Remover
                  </button>
                ) : (
                  <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                    className="text-xs px-4 py-1.5 rounded-lg font-bold transition-all"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)', cursor: couponCode.trim() ? 'pointer' : 'default' }}
                    onMouseEnter={e => { if (couponCode.trim()) { (e.currentTarget as any).style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)'; (e.currentTarget as any).style.color = 'white'; (e.currentTarget as any).style.borderColor = 'transparent'; (e.currentTarget as any).style.boxShadow = '0 4px 15px rgba(124,58,237,0.4)'; }}}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(139,92,246,0.15)'; (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.borderColor = 'rgba(139,92,246,0.3)'; (e.currentTarget as any).style.boxShadow = 'none'; }}>
                    {couponLoading ? '...' : 'Aplicar'}
                  </button>
                )}
              </div>
              {coupon && (
                <div className="flex items-center justify-between px-3 pb-2.5">
                  <span className="text-xs font-bold" style={{ color: '#34d399' }}>✓ Cupom {coupon.code} aplicado</span>
                  <span className="text-xs font-bold" style={{ color: '#34d399' }}>−R$ {coupon.discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* ── Price summary ── */}
            {coupon && (
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total com desconto</span>
                <span className="text-2xl font-black" style={{ color: '#34d399', fontFamily: "'Syne', sans-serif" }}>
                  R$ {finalPrice.toFixed(2)}
                </span>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="space-y-3 mb-6">
              <button disabled={product.stock === 0}
                onClick={() => { addItem(product.id, qty); router.push('/checkout'); }}
                className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 relative overflow-hidden"
                style={{
                  background: product.stock === 0 ? 'var(--surface-3)' : 'linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#5b21b6 100%)',
                  boxShadow: product.stock === 0 ? 'none' : '0 8px 30px rgba(124,58,237,0.5)',
                  cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: "'Syne', sans-serif", fontSize: '1rem', letterSpacing: '0.05em',
                  transition: 'box-shadow 0.2s, filter 0.2s',
                }}
                onMouseEnter={e => { if (product.stock !== 0) { (e.currentTarget as any).style.boxShadow = '0 0 35px rgba(139,92,246,0.8), 0 8px 30px rgba(124,58,237,0.6)'; (e.currentTarget as any).style.filter = 'brightness(1.15)'; }}}
                onMouseLeave={e => { (e.currentTarget as any).style.boxShadow = product.stock === 0 ? 'none' : '0 8px 30px rgba(124,58,237,0.5)'; (e.currentTarget as any).style.filter = 'none'; }}>
                {product.stock !== 0 && <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.08) 0%,transparent 55%)' }} />}
                {product.stock === 0 ? 'Sem Estoque' : 'Comprar Agora'}
              </button>
              <div className="flex gap-3">
                <button disabled={product.stock === 0}
                  onClick={() => { addItem(product.id, qty); toast.success('Adicionado ao carrinho! 🛒'); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-bright)', color: 'var(--text-primary)', opacity: product.stock === 0 ? 0.5 : 1, fontFamily: "'Syne', sans-serif" }}
                  onMouseEnter={e => { if (product.stock !== 0) { (e.currentTarget as any).style.borderColor = 'var(--violet-500)'; (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.background = 'rgba(139,92,246,0.08)'; }}}
                  onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border-bright)'; (e.currentTarget as any).style.color = 'var(--text-primary)'; (e.currentTarget as any).style.background = 'var(--surface-2)'; }}>
                  <ShoppingCart size={16} /> Adicionar ao Carrinho
                </button>
                <button onClick={handleFav}
                  className="p-3 rounded-xl transition-all flex-shrink-0"
                  style={{ border: `1.5px solid ${isLiked ? 'rgba(244,63,94,0.4)' : 'var(--border-bright)'}`, background: isLiked ? 'rgba(244,63,94,0.1)' : 'var(--surface-2)', color: isLiked ? '#f43f5e' : 'var(--text-muted)' }}>
                  <Heart size={20} style={{ fill: isLiked ? '#f43f5e' : 'none' }} />
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-2 p-4 rounded-2xl" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)' }}>
              {[
                { icon: '⚡', text: 'Acesso imediato após pagamento', color: '#34d399' },
                { icon: '🔒', text: 'Compra 100% segura e protegida', color: '#60a5fa' },
                { icon: '📱', text: 'Suporte via WhatsApp', color: '#a78bfa' },
                { icon: '🔄', text: 'Satisfação garantida', color: '#fbbf24' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">{b.icon}</span>
                  <span style={{ color: 'rgba(226,217,243,0.8)' }}>{b.text}</span>
                </div>
              ))}
            </div>

            {product.sku && <p className="text-xs mt-3" style={{ color: 'var(--text-ghost)' }}>SKU: {product.sku}</p>}
          </div>
        </div>

        {/* ── Description ── */}
        {product.description && (
          <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
            <button onClick={() => setShowDesc(v => !v)}
              className="w-full flex items-center justify-between p-5 text-left"
              style={{ background: 'rgba(139,92,246,0.06)' }}>
              <h2 className="text-lg font-black" style={{ fontFamily: "'Syne', sans-serif", color: '#e2d9f3' }}>📋 Descrição do Produto</h2>
              {showDesc ? <ChevronUp size={18} style={{ color: 'var(--violet-400)' }} /> : <ChevronDown size={18} style={{ color: 'var(--violet-400)' }} />}
            </button>
            {showDesc && (
              <div className="p-5" style={{ background: 'rgba(30,27,50,0.5)' }}>
                <p className="leading-relaxed whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Reviews ── */}
        {product.reviews?.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
                ⭐ Avaliações <span style={{ color: 'var(--violet-400)' }}>({product.totalReviews})</span>
              </h2>
              {/* Rating summary */}
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: '#fbbf24' }}>
                  {avgRating.toFixed(1)}
                </span>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => <Star key={n} size={14} style={{ fill: n <= Math.round(avgRating) ? '#fbbf24' : 'var(--surface-3)', color: n <= Math.round(avgRating) ? '#fbbf24' : 'var(--surface-3)' }} />)}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.totalReviews} avaliações</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {product.reviews.map((r: any) => (
                <div key={r.id} className="p-4 rounded-2xl" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                      style={{ background: 'var(--grad-neon)', fontFamily: "'Syne', sans-serif" }}>
                      {r.user.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{r.user.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                          ✓ Compra verificada
                        </span>
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(n => <Star key={n} size={11} style={{ fill: n <= r.rating ? '#fbbf24' : 'var(--surface-3)', color: n <= r.rating ? '#fbbf24' : 'var(--surface-3)' }} />)}
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                      {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  {r.title && <p className="font-bold text-sm mb-1" style={{ color: '#e2d9f3' }}>{r.title}</p>}
                  {r.body && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Related ── */}
        {product.related?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-black mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>Produtos Relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {product.related.map((p: any) => (
                <Link key={p.id} href={`/produto/${p.slug}`} className="product-card group overflow-hidden block">
                  <div className="relative h-40 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    {p.images?.[0]?.url
                      ? <Image src={p.images[0].url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="font-black" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>R$ {Number(p.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom buy */}
      <StickyBuy
        product={product}
        qty={qty}
        onBuy={() => { addItem(product.id, qty); router.push('/checkout'); }}
        onCart={() => { addItem(product.id, qty); toast.success('Adicionado ao carrinho! 🛒'); }}
      />

      <Footer />
    </>
  );
}