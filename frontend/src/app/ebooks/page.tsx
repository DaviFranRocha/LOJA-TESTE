'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import Link from 'next/link';
import { ShoppingCart, Star, Download, Heart } from 'lucide-react';
import { useWishlistStore, useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const SLUG = 'ebooks';
const LABEL: Record<string, string> = { ebooks: 'E-Books', cursos: 'Cursos', jogos: 'Jogos' };
const EMOJI: Record<string, string> = { ebooks: '📚', cursos: '🎓', jogos: '🎮' };

export default function CategorySlugPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const addToCart  = useCartStore(s => s.addItem);
  const { ids, toggle } = useWishlistStore();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    // Try to load by slug
    api.get('/categories/' + SLUG)
      .then(r => {
        const cat = r.data.data;
        setCategory(cat);
        setProducts(cat.products || []);
      })
      .catch(() => {
        // Fallback: search products with keyword
        api.get('/products?search=' + LABEL[SLUG] + '&limit=20')
          .then(r => setProducts(r.data.data || []))
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFav = async (productId: string) => {
    if (!user) { toast.error('Faça login para salvar favoritos'); return; }
    toggle(productId);
    try { await api.post('/wishlist/toggle', { productId }); }
    catch {}
  };

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-bright)' }}>
            {category?.imageUrl
              ? <img src={category.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.875rem' }} />
              : EMOJI[SLUG]}
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
              {category?.name || LABEL[SLUG]}
            </h1>
            {category?.description && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{category.description}</p>
            )}
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {products.length} produto{products.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="skeleton h-48" />
                <div className="p-4 space-y-2"><div className="skeleton h-3 w-3/4 rounded" /><div className="skeleton h-5 w-1/3 rounded" /></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{EMOJI[SLUG]}</p>
            <h2 className="text-xl font-black mb-2" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              Nenhum produto ainda
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Produtos de {LABEL[SLUG]} aparecerão aqui quando cadastrados.
            </p>
            <Link href="/loja" className="btn-primary px-8 py-3">Ver Todos os Produtos</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map(p => {
              const img  = p.images?.[0]?.url;
              const disc = p.comparePrice ? Math.round((1 - Number(p.price)/Number(p.comparePrice))*100) : 0;
              const isLiked = ids.includes(p.id);
              return (
                <div key={p.id} className="product-card group relative">
                  <button onClick={() => handleFav(p.id)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isLiked ? 'rgba(244,63,94,0.2)' : 'rgba(4,3,10,0.5)',
                      border: '1px solid ' + (isLiked ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'),
                      color: isLiked ? '#f43f5e' : 'white',
                      backdropFilter: 'blur(4px)',
                    }}>
                    <Heart size={13} style={{ fill: isLiked ? '#f43f5e' : 'none' }} />
                  </button>
                  <Link href={'/produto/' + p.slug} className="block">
                    <div className="relative h-48 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      {img
                        ? <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} className="group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
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
                  <div className="p-4">
                    <Link href={'/produto/' + p.slug}>
                      <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-black" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>
                        R$ {Number(p.price).toFixed(2)}
                      </p>
                      <button onClick={() => { addToCart(p.id, 1); toast.success('Adicionado! 🛒'); }}
                        className="p-2.5 rounded-xl text-white transition-all hover:scale-110"
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