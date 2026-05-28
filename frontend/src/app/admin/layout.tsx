'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart3,
  Settings, Image as ImageIcon, Tag, LogOut, Menu, X,
  Bell, Star, Percent, TrendingUp, FileText,
  Zap, Shield
} from 'lucide-react';

// ── Permissões por cargo ───────────────────────────────────────
const ROLE_LEVEL: Record<string, number> = {
  CUSTOMER: 0, GERENTE: 1, ADMIN: 2, SUPER_ADMIN: 3,
};

const hasPermission = (userRole: string, minRole: string) => {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
};

const ROLE_INFO: Record<string, { label: string; color: string; icon: any }> = {
  SUPER_ADMIN: { label: 'Super Admin',color: '#f87171', icon: Shield },
  ADMIN:       { label: 'Admin',      color: '#a78bfa', icon: Shield },
  GERENTE:     { label: 'Gerente',    color: '#60a5fa', icon: Star },
  CUSTOMER:    { label: 'Cliente',    color: '#9ca3af', icon: Users },
};

// ── Nav items com controle de acesso ─────────────────────────
const getNavGroups = (role: string) => {
  const isSuperAdmin = role === 'SUPER_ADMIN'; // Controle total
  const isAdmin      = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  const isGerente    = ['SUPER_ADMIN', 'ADMIN', 'GERENTE'].includes(role);

  const groups = [
    {
      label: 'Principal',
      items: [
        { href: '/admin',            icon: LayoutDashboard, label: 'Dashboard',   show: isGerente },
        { href: '/admin/relatorios', icon: TrendingUp,      label: 'Relatórios',  show: isAdmin },
      ]
    },
    {
      label: 'Catálogo',
      items: [
        { href: '/admin/produtos',   icon: Package, label: 'Produtos',   show: isGerente },
        { href: '/admin/categorias', icon: Tag,     label: 'Categorias', show: isAdmin },
        { href: '/admin/avaliacoes', icon: Star,    label: 'Avaliações', show: isAdmin },
      ]
    },
    {
      label: 'Vendas',
      items: [
        { href: '/admin/pedidos',    icon: ShoppingBag, label: 'Pedidos',    show: isGerente },
        { href: '/admin/cupons',     icon: Percent,     label: 'Cupons',     show: isAdmin },
        { href: '/admin/pagamentos', icon: FileText,    label: 'Pagamentos', show: isAdmin },
      ]
    },
    {
      label: 'Clientes',
      items: [
        { href: '/admin/usuarios',    icon: Users, label: 'Usuários',      show: isSuperAdmin },
        { href: '/admin/notificacoes',icon: Bell,  label: 'Notificações',  show: isAdmin },
      ]
    },
    {
      label: 'Marketing',
      items: [
        { href: '/admin/banners', icon: ImageIcon, label: 'Banners', show: isAdmin },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { href: '/admin/logs',   icon: FileText, label: 'Logs',           show: isSuperAdmin },
        { href: '/admin/config', icon: Settings, label: 'Configurações',  show: isSuperAdmin },
      ]
    },
  ];

  return groups.map(g => ({
    ...g,
    items: g.items.filter(i => i.show),
  })).filter(g => g.items.length > 0);
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();
  const path   = usePathname();
  const [sideOpen, setSideOpen] = useState(false);
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
      if (!user) { router.push('/auth/login'); return; }
      const allowed = ['ADMIN', 'SUPER_ADMIN', 'GERENTE'];
      if (!allowed.includes(user.role)) router.push('/');
    }, 100);
    return () => clearTimeout(t);
  }, [user]);

  if (!ready || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--void)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--violet-500)' }} />
    </div>
  );

  const navGroups = getNavGroups(user.role);
  const roleInfo = ROLE_INFO[user.role] || ROLE_INFO['GERENTE'];
  const RoleIcon = roleInfo.icon;

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: 'var(--abyss)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--border-bright)', boxShadow: '0 0 12px rgba(139,92,246,0.25)' }}>
          <Image src="/logo.png" alt="Francis Store" fill className="object-contain" unoptimized />
        </div>
        <div>
          <p className="text-xs font-black tracking-widest uppercase"
            style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)', letterSpacing: '0.1em', lineHeight: 1.2 }}>
            FRANCIS
          </p>
          <p className="text-xs font-black tracking-widest uppercase text-gradient"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '0.1em', lineHeight: 1.2 }}>
            ADMIN
          </p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative"
            style={{ border: '1.5px solid var(--border-bright)' }}>
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-sm"
                style={{ background: 'var(--grad-neon)', fontFamily: "'Syne', sans-serif" }}>
                {user.name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
              {user.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs font-bold" style={{ color: roleInfo.color, fontFamily: "'Syne', sans-serif" }}>
                <RoleIcon size={10} className="inline mr-1" />
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2 px-2"
              style={{ color: 'var(--text-ghost)', fontFamily: "'Syne', sans-serif", letterSpacing: '0.12em' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon    = item.icon;
                const active  = path === item.href || (item.href !== '/admin' && path.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setSideOpen(false)}
                    className="admin-nav-item"
                    style={{
                      background:  active ? 'rgba(139,92,246,0.12)' : 'transparent',
                      color:       active ? 'var(--violet-400)' : 'var(--text-secondary)',
                      borderLeft:  active ? '2px solid var(--violet-500)' : '2px solid transparent',
                      fontFamily:  "'DM Sans', sans-serif",
                    }}>
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/"
          className="admin-nav-item"
          style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>
          <Zap size={15} /> Ver Loja
        </Link>
        <button onClick={logout}
          className="admin-nav-item w-full text-left"
          style={{ color: '#fca5a5', fontFamily: "'DM Sans', sans-serif" }}>
          <LogOut size={15} /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--void)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 flex-shrink-0 h-full">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 h-full"><Sidebar /></div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ background: 'var(--abyss)', borderBottom: '1px solid var(--border)', height: 56 }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onClick={() => setSideOpen(true)}>
              <Menu size={18} />
            </button>
            {/* Breadcrumb */}
            <div className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
              {navGroups.flatMap(g => g.items).find(i => path === i.href || (i.href !== '/admin' && path.startsWith(i.href)))?.label || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-bright)', color: roleInfo.color, fontFamily: "'Syne', sans-serif" }}>
              <RoleIcon size={11} />
              {roleInfo.label}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5" style={{ background: '#f8f7ff' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
