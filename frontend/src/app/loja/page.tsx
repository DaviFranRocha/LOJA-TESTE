'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Star, ShoppingCart, Download, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState(searchParams.get('search') || '');
  const [sort, setSort]         = useState('createdAt');
  const [order, setOrder]       = useState('desc');
  const addItem = useCartStore(s => s.addItem);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort, order });
      if (search) params.set('search', search);
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.data);
      setTotal(data.pagination.total);
    } catch { toast.error('Erro ao carregar produtos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [page, sort, order]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProducts(); };

  const selectStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '0.75rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
            Todos os <span className="text-gradient">Produtos</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Explore nossa coleção de produtos digitais</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produtos..." className="input pl-10" />
            </div>
            <button type="submit" className="btn-primary px-5">Buscar</button>
          </form>
          <div className="flex gap-2">
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="createdAt">Mais recentes</option>
              <option value="price">Preço</option>
              <option value="avgRating">Avaliação</option>
              <option value="totalSold">Mais vendidos</option>
            </select>
            <select value={order} onChange={e => { setOrder(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>
        </div>

        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="skeleton h-48" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-5 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>
              Nenhum produto encontrado
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map(p => {
              const disc = p.comparePrice ? Math.round((1 - Number(p.price)/Number(p.comparePrice))*100) : 0;
              const img = p.images?.[0]?.url;
              return (
                <div key={p.id} className="product-card group">
                  <Link href={`/produto/${p.slug}`} className="block">
                    <div className="relative h-48 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      {img ? (
                        <Image src={img} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
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
                      {p.category?.name}
                    </p>
                    <Link href={`/produto/${p.slug}`}>
                      <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2 transition-colors"
                        style={{ color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>
                        {p.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-0.5 mb-3">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={11} style={{ fill: n <= Math.round(p.avgRating) ? '#fbbf24' : 'var(--surface-3)', color: n <= Math.round(p.avgRating) ? '#fbbf24' : 'var(--surface-3)' }} />
                      ))}
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>({p.totalReviews})</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        {p.comparePrice && <p className="text-xs line-through" style={{ color: 'var(--text-ghost)' }}>R$ {Number(p.comparePrice).toFixed(2)}</p>}
                        <p className="text-lg font-black" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>
                          R$ {Number(p.price).toFixed(2)}
                        </p>
                      </div>
                      <button onClick={() => { addItem(p.id); toast.success('Adicionado! 🛒'); }}
                        className="p-2.5 rounded-xl text-white transition-all hover:scale-110 active:scale-95 flex-shrink-0 glow-sm"
                        style={{ background: 'var(--grad-neon)' }}>
                        <ShoppingCart size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-10">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-5 py-2.5 disabled:opacity-40">Anterior</button>
            <span className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>Página {page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary px-5 py-2.5 disabled:opacity-40">Próxima</button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}