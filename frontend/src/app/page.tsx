'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Star, ArrowRight, Download, Lock, Headphones, CreditCard, TrendingUp, ChevronLeft, ChevronRight, Sparkles, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';

// ── Product Card ───────────────────────────────────────────────
function ProductCard({ product, onAddToCart }: { product: any; onAddToCart: () => void }) {
  const img  = product.images?.[0]?.url;
  const disc = product.comparePrice ? Math.round((1 - Number(product.price)/Number(product.comparePrice))*100) : 0;
  return (
    <div className="product-card group">
      <Link href={`/produto/${product.slug}`} className="block">
        <div className="relative h-48 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          {img ? (
            <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', display: 'block' }}
              className="group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
          )}
          {disc > 0 && (
            <span className="absolute top-3 left-3 text-white text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', fontFamily: "'Syne', sans-serif" }}>
              -{disc}%
            </span>
          )}
          <span className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs px-2 py-1 rounded-lg"
            style={{ background: 'rgba(4,3,10,0.7)', backdropFilter: 'blur(4px)' }}>
            <Download size={10} /> Digital
          </span>
        </div>
      </Link>
      <div className="p-4 relative z-10">
        <p className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--violet-500)', fontFamily: "'Syne', sans-serif" }}>
          {product.category?.name}
        </p>
        <Link href={`/produto/${product.slug}`}>
          <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2 transition-colors"
            style={{ color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-0.5 mb-3">
          {[1,2,3,4,5].map(n => (
            <Star key={n} size={11} style={{ fill: n <= Math.round(product.avgRating||0) ? '#fbbf24' : 'var(--surface-3)', color: n <= Math.round(product.avgRating||0) ? '#fbbf24' : 'var(--surface-3)' }} />
          ))}
          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>({product.totalReviews||0})</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            {product.comparePrice && <p className="text-xs line-through" style={{ color: 'var(--text-ghost)' }}>R$ {Number(product.comparePrice).toFixed(2)}</p>}
            <p className="text-lg font-black" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>R$ {Number(product.price).toFixed(2)}</p>
          </div>
          <button onClick={onAddToCart} className="p-2.5 rounded-xl text-white transition-all hover:scale-110 active:scale-95 flex-shrink-0"
            style={{ background: 'var(--grad-neon)', boxShadow: '0 4px 15px rgba(139,92,246,0.35)' }}>
            <ShoppingCart size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featured, setFeatured]     = useState<any[]>([]);
  const [banners, setBanners]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catProducts, setCatProducts] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab]   = useState<string>('all');
  const [loading, setLoading]       = useState(true);
  const [active, setActive]         = useState(0);
  const addToCart = useCartStore(s => s.addItem);

  useEffect(() => {
    Promise.all([
      api.get('/products/featured').then(r => setFeatured(r.data.data || [])).catch(() => {}),
      api.get('/banners').then(r => setBanners(r.data.data || [])).catch(() => {}),
      api.get('/categories').then(r => {
        const cats = r.data.data || [];
        setCategories(cats);
        // Load products per category
        cats.forEach((cat: any) => {
          api.get(`/products?categoryId=${cat.id}&limit=8`)
            .then(r => setCatProducts(prev => ({ ...prev, [cat.id]: r.data.data || [] })))
            .catch(() => {});
        });
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback((currentBanners: any[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentBanners.length < 2) return;
    timerRef.current = setInterval(() => setActive(p => (p + 1) % currentBanners.length), 12000);
  }, []);

  useEffect(() => {
    startTimer(banners);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners]);

  // Reset timer when user clicks manually
  const goTo = useCallback((idx: number, currentBanners: any[]) => {
    setActive(idx);
    startTimer(currentBanners);
  }, [startTimer]);

  const banner = banners[active];
  const hasBannerImage = !!banner?.imageUrl;

  const displayProducts = activeTab === 'all'
    ? featured
    : (catProducts[activeTab] || []);

  return (
    <>
      <Navbar />
      <main style={{ background: 'var(--void)' }}>

        {/* ── HERO / BANNER ─────────────────────────────── */}
        <section className="relative overflow-hidden" style={{ minHeight: 640 }}>
          {/* Background — suporta imagem, GIF e vídeo */}
          {hasBannerImage ? (
            <>
              {banner.mediaType === 'video' ? (
                <video
                  src={banner.imageUrl}
                  autoPlay muted loop playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <img src={banner.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div className="absolute inset-0" style={{ background: banner?.overlayColor || 'rgba(4,3,10,0.40)' }} />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#0c0b18 0%,#07060f 100%)' }} />
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-28" style={{ minHeight: 640 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold mb-7 uppercase tracking-widest animate-fade-up"
              style={{
                background: 'rgba(4,3,10,0.6)',
                border: '1px solid rgba(157,111,255,0.4)',
                color: '#c4b5fd',
                backdropFilter: 'blur(12px)',
                fontFamily: "'Syne', sans-serif",
                boxShadow: '0 0 20px rgba(139,92,246,0.15)',
              }}>
              <Sparkles size={12} style={{ color: '#a78bfa' }} />
              {banner?.subtitle || 'Produtos Digitais Premium'}
            </div>

            {/* Título com backdrop para legibilidade sobre qualquer imagem */}
            <div className="animate-fade-up mb-6" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  color: banner?.titleColor || '#ffffff',
                  textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5)',
                  letterSpacing: '-0.02em',
                }}>
                {banner?.title || (
                  <>Bem-vindo à<br />
                    <span style={{
                      background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 40%, #9d6fff 70%, #e879f9 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 30px rgba(157,111,255,0.5))',
                    }}>Francis Store</span>
                  </>
                )}
              </h1>
            </div>

            <p className="text-base md:text-lg mb-10 max-w-lg leading-relaxed animate-fade-up"
              style={{
                color: banner?.subtitleColor || 'rgba(240,236,255,0.85)',
                animationDelay: '0.2s',
                fontFamily: "'DM Sans', sans-serif",
                textShadow: '0 1px 8px rgba(0,0,0,0.6)',
              }}>
              Acesso imediato após a compra. Produtos digitais de alta qualidade.
            </p>

            <div className="flex flex-wrap gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.3s' }}>
              {(banner?.buttonText || !hasBannerImage) && (
                <Link href={banner?.linkUrl || '/loja'}
                  className="inline-flex items-center gap-2 font-black px-8 py-4 rounded-2xl transition-all"
                  style={{
                    background: banner?.buttonColor || 'linear-gradient(135deg, #9d6fff, #7c3aed)',
                    color: banner?.buttonTextColor || '#ffffff',
                    boxShadow: `0 8px 30px ${banner?.buttonColor ? banner.buttonColor + '80' : 'rgba(124,58,237,0.5)'}`,
                    fontFamily: "'Syne', sans-serif",
                    fontSize: '1rem',
                    letterSpacing: '0.05em',
                  }}>
                  {banner?.buttonText || 'Adquira Agora'} <ArrowRight size={18} />
                </Link>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-10 mt-14 animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {[['500+','Produtos'],['10k+','Clientes'],['4.9★','Avaliação']].map(([num, lbl], i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-black" style={{
                    fontFamily: "'Syne', sans-serif", color: '#ffffff',
                    textShadow: '0 0 20px rgba(157,111,255,0.6)',
                  }}>{num}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(196,181,253,0.6)' }}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Banner controls */}
          {banners.length > 1 && (
            <>
              <button onClick={() => goTo(active === 0 ? banners.length-1 : active-1, banners)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all"
                style={{ background: 'rgba(4,3,10,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(157,111,255,0.3)' }}>
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => goTo((active+1)%banners.length, banners)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all"
                style={{ background: 'rgba(4,3,10,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(157,111,255,0.3)' }}>
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
                {banners.map((_,i) => (
                  <button key={i} onClick={() => goTo(i, banners)}
                    className="rounded-full transition-all"
                    style={{ width: i===active ? 28 : 10, height: 10, background: i===active ? '#9d6fff' : 'rgba(255,255,255,0.25)', boxShadow: i===active ? '0 0 10px rgba(157,111,255,0.6)' : 'none' }} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── BENEFITS BAR ──────────────────────────────── */}
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Download size={16} />, text: 'Acesso Imediato',  color: '#9d6fff', bg: 'rgba(157,111,255,0.1)' },
              { icon: <Lock size={16} />,     text: 'Pagamento Seguro', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
              { icon: <CreditCard size={16} />,text: '12x Sem Juros',   color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
              { icon: <Headphones size={16} />,text: 'Suporte 24h',     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
            ].map((b,i) => (
              <div key={i} className="flex items-center gap-3 group py-1">
                <span className="p-2.5 rounded-xl flex-shrink-0 transition-all group-hover:scale-110"
                  style={{ background: b.bg, color: b.color }}>{b.icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>{b.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CATEGORIES + PRODUCTS WITH TABS ───────────── */}
        {(categories.length > 0 || featured.length > 0) && (
          <section className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <TrendingUp size={22} style={{ color: 'var(--violet-500)' }} />
                  {activeTab === 'all' ? 'Destaques' : categories.find(c => c.id === activeTab)?.name || 'Produtos'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                  {activeTab === 'all' ? 'Os mais acessados desta semana' : 'Produtos desta categoria'}
                </p>
              </div>
              <Link href="/loja" className="btn-secondary text-sm">Ver todos <ArrowRight size={14} /></Link>
            </div>

            {/* Tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 mb-7 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0"
                  style={{
                    background: activeTab === 'all' ? 'var(--grad-neon)' : 'var(--surface-2)',
                    color: activeTab === 'all' ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${activeTab === 'all' ? 'transparent' : 'var(--border)'}`,
                    fontFamily: "'Syne', sans-serif",
                    boxShadow: activeTab === 'all' ? '0 4px 15px rgba(139,92,246,0.35)' : 'none',
                  }}>
                  ⭐ Destaques
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2"
                    style={{
                      background: activeTab === cat.id ? 'var(--grad-neon)' : 'var(--surface-2)',
                      color: activeTab === cat.id ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${activeTab === cat.id ? 'transparent' : 'var(--border)'}`,
                      fontFamily: "'Syne', sans-serif",
                      boxShadow: activeTab === cat.id ? '0 4px 15px rgba(139,92,246,0.35)' : 'none',
                    }}>
                    {cat.imageUrl && (
                      <img src={cat.imageUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
                    )}
                    {cat.name}
                    <span className="text-xs opacity-70">({cat._count?.products || 0})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Products grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[...Array(8)].map((_,i) => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="skeleton h-48" /><div className="p-4 space-y-2"><div className="skeleton h-3 w-3/4 rounded" /><div className="skeleton h-5 w-1/3 rounded" /></div>
                  </div>
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                  Nenhum produto nesta categoria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {displayProducts.map(p => (
                  <ProductCard key={p.id} product={p}
                    onAddToCart={() => { addToCart(p.id, 1); toast.success('Adicionado ao carrinho! 🛒'); }} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}