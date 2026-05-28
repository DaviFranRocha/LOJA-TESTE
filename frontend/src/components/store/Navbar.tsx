'use client';

import Link from 'next/link';
import Image from 'next/image';
import NotificationBell from './NotificationBell';
import { ShoppingCart, User, Search, Menu, X, Heart, ChevronDown, Home, Package, BookOpen, Wrench, Gamepad2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useCartStore, useAuthStore, useWishlistStore } from '@/lib/store';

// Instagram + Discord SVG icons
const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
const DiscordIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const NAV_LINKS = [
  { href: '/',         icon: <Home size={14} />,           label: 'Início' },
  { href: '/loja',     icon: <Package size={14} />,        label: 'Produtos' },
  { href: '/ebooks',   icon: <BookOpen size={14} />,       label: 'E-Books' },
  { href: '/ferramentas',   icon: <Wrench size={14} />,          label: 'Ferramentas' },
  { href: '/jogos',    icon: <Gamepad2 size={14} />,       label: 'Jogos' },
];

// Social links — edit here
const SOCIAL = {
  instagram: 'https://instagram.com/franciscostore',
  discord:   'https://discord.gg/nBJGJG3DwJ',
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [search, setSearch]     = useState('');
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const cartCount    = useCartStore(s => s.items.reduce((t, i) => t + i.quantity, 0));
  const wishlistCount = useWishlistStore(s => s.ids.length);
  const user  = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) window.location.href = `/loja?search=${encodeURIComponent(search)}`;
  };

  return (
    <>
      {/* Announcement strip */}
      <div className="text-center py-1.5 text-xs font-semibold tracking-wide overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #4c1d95, #6d28d9, #7c3aed, #8b5cf6, #7c3aed, #6d28d9, #4c1d95)',
          backgroundSize: '300% 100%',
          animation: 'borderFlow 4s linear infinite',
          color: '#e9d5ff',
        }}>
        <span className="opacity-80">⚡ Acesso imediato após o pagamento</span>
        <span className="mx-3 opacity-40">·</span>
        <span className="opacity-80">💳 12x sem juros</span>
        <span className="mx-3 opacity-40">·</span>
        <span className="opacity-80">🔒 Checkout 100% seguro</span>
      </div>

      <header className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(7,6,15,0.95)' : 'rgba(7,6,15,0.80)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(139,92,246,0.1)',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                style={{ boxShadow: '0 0 15px rgba(139,92,246,0.3)' }}>
                <Image src="/logo.png" alt="Francis Store" fill className="object-contain" unoptimized />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-sm font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Syne', sans-serif", color: '#f1effe', letterSpacing: '0.12em' }}>FRANCIS</span>
                <span className="text-sm font-black tracking-widest uppercase text-gradient"
                  style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '0.12em' }}>STORE</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'rgba(196,181,253,0.7)', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => { (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.background = 'rgba(139,92,246,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.color = 'rgba(196,181,253,0.7)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                  {l.icon}{l.label}
                </Link>
              ))}
            </nav>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produtos..." className="input pl-10 py-2"
                  style={{ background: 'rgba(17,16,35,0.8)', fontSize: '0.8125rem' }} />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Social buttons */}
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer"
                title="Instagram"
                className="hidden md:flex p-2 rounded-xl transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as any).style.color = '#f9a8d4'; (e.currentTarget as any).style.background = 'rgba(249,168,212,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                <InstagramIcon />
              </a>
              <a href={SOCIAL.discord} target="_blank" rel="noopener noreferrer"
                title="Discord"
                className="hidden md:flex p-2 rounded-xl transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as any).style.color = '#a5b4fc'; (e.currentTarget as any).style.background = 'rgba(99,102,241,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                <DiscordIcon />
              </a>

              {/* Wishlist */}
              <Link href="/favoritos" title="Favoritos"
                className="relative p-2.5 rounded-xl transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as any).style.color = '#f9a8d4'; (e.currentTarget as any).style.background = 'rgba(249,168,212,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                <Heart size={19} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-xs font-black flex items-center justify-center"
                    style={{ background: '#f43f5e', fontSize: '0.6rem' }}>
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Notifications */}
          {user && <NotificationBell />}

          {/* Cart */}
              <Link href="/carrinho" className="relative p-2.5 rounded-xl transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.background = 'rgba(139,92,246,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                <ShoppingCart size={19} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center glow-sm"
                    style={{ background: 'var(--grad-neon)', fontFamily: "'Syne', sans-serif" }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* User */}
              {user ? (
                <div className="relative" ref={dropRef}>
                  <button onClick={() => setDropOpen(v => !v)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-all ml-1"
                    style={{ border: '1px solid var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'var(--border-bright)'; (e.currentTarget as any).style.background = 'var(--surface)'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ border: '1.5px solid var(--border-bright)' }}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-black"
                          style={{ background: 'var(--grad-neon)', fontFamily: "'Syne', sans-serif" }}>
                          {user.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-semibold"
                      style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown size={12} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: dropOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>

                  {dropOpen && (
                    <div className="absolute right-0 top-full mt-2 rounded-2xl py-1.5 w-56 z-50 animate-slide-down"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-bright)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                      <div className="px-4 py-3 mb-1"
                        style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), transparent)', borderRadius: '0.875rem 0.875rem 0 0' }}>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>{user.name}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                      {[
                        { href: '/conta',         label: '👤  Minha Conta' },
                        { href: '/meus-produtos', label: '📥  Meus Produtos' },
                        { href: '/pedidos',       label: '📦  Meus Pedidos' },
                        { href: '/favoritos',     label: '❤️  Favoritos' },
                      ].map(l => (
                        <Link key={l.href} href={l.href} onClick={() => setDropOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm transition-all"
                          style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}
                          onMouseEnter={e => { (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.background = 'rgba(139,92,246,0.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-secondary)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                          {l.label}
                        </Link>
                      ))}
                      {['GERENTE','ADMIN','SUPER_ADMIN'].includes(user.role) && (
                        <Link href="/admin" onClick={() => setDropOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm font-semibold transition-all"
                          style={{ color: 'var(--violet-400)', fontFamily: "'DM Sans', sans-serif" }}
                          onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(139,92,246,0.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent'; }}>
                          ⚙️  Painel Admin
                        </Link>
                      )}
                      <div className="my-1 mx-3" style={{ height: 1, background: 'var(--border)' }} />
                      <button onClick={() => { setDropOpen(false); logout(); }}
                        className="w-full flex items-center px-4 py-2.5 text-sm transition-all"
                        style={{ color: '#fca5a5', fontFamily: "'DM Sans', sans-serif" }}
                        onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(239,68,68,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent'; }}>
                        🚪  Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth/login" className="btn-primary text-sm py-2 px-4 ml-1" style={{ fontSize: '0.8125rem' }}>
                  Entrar
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button className="lg:hidden p-2.5 rounded-xl ml-1 transition-all"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onClick={() => setMenuOpen(v => !v)}>
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="lg:hidden py-4 space-y-1 animate-slide-down"
              style={{ borderTop: '1px solid var(--border)' }}>
              <form onSubmit={handleSearch} className="mb-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="input pl-9 text-sm" />
                </div>
              </form>
              {NAV_LINKS.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium transition-all text-sm"
                  style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => { (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.background = 'rgba(139,92,246,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-secondary)'; (e.currentTarget as any).style.background = 'transparent'; }}>
                  {l.icon}{l.label}
                </Link>
              ))}
              {/* Mobile social */}
              <div className="flex gap-3 px-3 pt-2">
                <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all"
                  style={{ color: '#f9a8d4', background: 'rgba(249,168,212,0.08)', border: '1px solid rgba(249,168,212,0.15)' }}>
                  <InstagramIcon /> Instagram
                </a>
                <a href={SOCIAL.discord} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all"
                  style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <DiscordIcon /> Discord
                </a>
              </div>
              {user && (
                <button onClick={logout} className="block w-full text-left px-3 py-2.5 rounded-xl font-medium transition-all text-sm mt-1"
                  style={{ color: '#fca5a5' }}>
                  🚪 Sair
                </button>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}