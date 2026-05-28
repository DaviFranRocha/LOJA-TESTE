'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Trash2, ArrowRight, Package } from 'lucide-react';
import { useWishlistStore, useAuthStore, useCartStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';

export default function FavoritosPage() {
  const user    = useAuthStore(s => s.user);
  const router  = useRouter();
  const { ids, remove, setAll } = useWishlistStore();
  const addToCart = useCartStore(s => s.addItem);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  // Sync with server on mount
  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    api.get('/wishlist').then(r => {
      const items = r.data.data || [];
      setAll(items.map((i: any) => i.productId));
      setProducts(items.map((i: any) => i.product).filter(Boolean));
    }).catch(() => {
      // Fallback: load products from local IDs
      if (ids.length > 0) {
        Promise.all(ids.map(id => api.get(`/products/id/${id}`).then(r => r.data.data).catch(() => null)))
          .then(prods => setProducts(prods.filter(Boolean)));
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleRemove = async (productId: string) => {
    try {
      await api.post('/wishlist/toggle', { productId });
      remove(productId);
      setProducts(p => p.filter(prod => prod.id !== productId));
      toast.success('Removido dos favoritos');
    } catch {
      remove(productId);
      setProducts(p => p.filter(prod => prod.id !== productId));
    }
  };

  const handleAddToCart = (productId: string) => {
    addToCart(productId, 1);
    toast.success('Adicionado ao carrinho! 🛒');
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <Heart size={20} style={{ color: '#f43f5e', fill: '#f43f5e' }} />
            </div>
            Meus <span className="text-gradient">Favoritos</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {products.length} produto{products.length !== 1 ? 's' : ''} salvo{products.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="skeleton h-48" />
                <div className="p-4 space-y-2"><div className="skeleton h-3 w-3/4 rounded" /><div className="skeleton h-5 w-1/3 rounded" /></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <Heart size={32} style={{ color: '#f43f5e' }} />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              Nenhum favorito ainda
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Curta produtos para salvá-los aqui
            </p>
            <Link href="/loja" className="btn-primary px-8 py-3">
              Explorar Produtos <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map(p => {
              const img = p.images?.[0]?.url;
              const disc = p.comparePrice ? Math.round((1 - Number(p.price)/Number(p.comparePrice))*100) : 0;
              return (
                <div key={p.id} className="product-card group relative">
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(244,63,94,0.25)'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(244,63,94,0.15)'; }}>
                    <Heart size={14} style={{ fill: '#f43f5e' }} />
                  </button>

                  <Link href={`/produto/${p.slug}`} className="block">
                    <div className="relative h-48 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      {img ? (
                        <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          className="group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                      )}
                      {disc > 0 && (
                        <span className="absolute top-3 left-3 text-white text-xs font-black px-2.5 py-1 rounded-full"
                          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', fontFamily: "'Syne', sans-serif" }}>
                          -{disc}%
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <p className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--violet-500)', fontFamily: "'Syne', sans-serif" }}>
                      {p.category?.name}
                    </p>
                    <Link href={`/produto/${p.slug}`}>
                      <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2"
                        style={{ color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>
                        {p.name}
                      </h3>
                    </Link>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div>
                        {p.comparePrice && <p className="text-xs line-through" style={{ color: 'var(--text-ghost)' }}>R$ {Number(p.comparePrice).toFixed(2)}</p>}
                        <p className="text-lg font-black" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>
                          R$ {Number(p.price).toFixed(2)}
                        </p>
                      </div>
                      <button onClick={() => handleAddToCart(p.id)}
                        className="p-2.5 rounded-xl text-white transition-all hover:scale-110 flex-shrink-0"
                        style={{ background: 'var(--grad-neon)', boxShadow: '0 4px 15px rgba(139,92,246,0.35)' }}>
                        <ShoppingCart size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}