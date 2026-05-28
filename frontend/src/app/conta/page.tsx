'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';
import { User, Package, LogOut, Save, Camera, Mail, Phone, FileText, Heart, ShoppingBag, Shield, Bell, ChevronRight, Star, Lock } from 'lucide-react';
import Link from 'next/link';

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Cliente', GERENTE: 'Gerente', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin',
};
const ROLE_COLOR: Record<string, string> = {
  CUSTOMER: '#a78bfa', GERENTE: '#a78bfa', ADMIN: '#c4b5fd', SUPER_ADMIN: '#c4b5fd',
};

export default function AccountPage() {
  const user    = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const logout  = useAuthStore(s => s.logout);
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm]           = useState({ name: '', phone: '', cpf: '' });
  const [saving, setSaving]       = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stats, setStats]         = useState({ orders: 0, spent: 0, wishlist: 0 });
  const [tab, setTab]             = useState<'info' | 'security'>('info');

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    api.get('/auth/me').then(r => {
      const u = r.data.data;
      setForm({ name: u.name || '', phone: u.phone || '', cpf: u.cpf || '' });
      setAvatarUrl(u.avatarUrl || '');
    });
    // Fetch order stats
    api.get('/orders?limit=100').then(r => {
      const orders = r.data.data || [];
      const paid   = orders.filter((o: any) => o.status === 'PAID' || o.status === 'DELIVERED');
      const spent  = paid.reduce((s: number, o: any) => s + Number(o.total), 0);
      setStats(prev => ({ ...prev, orders: paid.length, spent }));
    }).catch(() => {});
    api.get('/wishlist').then(r => {
      setStats(prev => ({ ...prev, wishlist: r.data.data?.length || 0 }));
    }).catch(() => {});
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 8MB.'); return; }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          const img = new window.Image();
          img.onerror = reject;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 400;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
              if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
              else { width = Math.round(width * MAX / height); height = MAX; }
            }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
      setAvatarUrl(base64);
      let finalUrl = base64;
      try {
        const fd = new FormData(); fd.append('image', file);
        const { data } = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
        if (data.data?.source === 'cloudinary') { finalUrl = data.data.url; setAvatarUrl(finalUrl); }
      } catch {}
      await api.patch('/users/profile', { avatarUrl: finalUrl });
      setUser({ ...user!, avatarUrl: finalUrl });
      toast.success('Foto atualizada! ✅');
    } catch { toast.error('Erro ao atualizar foto'); setAvatarUrl(user?.avatarUrl || '');
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/profile', form);
      setUser({ ...user!, name: form.name });
      toast.success('Perfil atualizado!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  if (!user) return null;

  const initials = user.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const memberSince = new Date((user as any).createdAt || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Hero Banner ── */}
        <div className="relative rounded-2xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, #120a2e 0%, #0d0a1f 50%, #0a0818 100%)', border: '1px solid var(--border)', minHeight: 160 }}>
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(139,92,246,0.2) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(109,40,217,0.08) 0%, transparent 60%)' }} />

          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pb-0 md:pb-6">
            {/* Avatar grande */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden"
                style={{ border: '3px solid rgba(139,92,246,0.5)', boxShadow: '0 0 30px rgba(139,92,246,0.3)', background: 'var(--surface-2)' }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black"
                    style={{ background: 'var(--grad-neon)', color: 'white', fontFamily: "'Syne', sans-serif" }}>
                    {initials}
                  </div>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--grad-neon)', boxShadow: '0 4px 15px rgba(139,92,246,0.5)', border: '2px solid var(--abyss)' }}>
                {uploading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={14} className="text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left pb-2">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: '#f1effe' }}>
                  {user.name}
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: ROLE_COLOR[user.role] || 'var(--violet-400)' }}>
                  {ROLE_LABEL[user.role] || user.role}
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'rgba(196,181,253,0.6)' }}>{user.email}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Membro desde {memberSince}
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 pb-4 md:pb-6">
              {[
                { label: 'Pedidos', value: stats.orders, icon: ShoppingBag },
                { label: 'Gastos', value: `R$${stats.spent.toFixed(0)}`, icon: Star },
                { label: 'Favoritos', value: stats.wishlist, icon: Heart },
              ].map((s, i) => (
                <div key={i} className="text-center px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xl font-black" style={{ color: '#f1effe', fontFamily: "'Syne', sans-serif" }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* ── Sidebar ── */}
          <div className="space-y-3">
            {/* Nav */}
            <div className="card-elevated" style={{ padding: '0.75rem' }}>
              {[
                { href: null,       tab: 'info',     icon: User,     label: 'Meu Perfil' },
                { href: null,       tab: 'security', icon: Lock,     label: 'Segurança' },
                { href: '/pedidos', tab: null,        icon: Package,  label: 'Meus Pedidos' },
                { href: '/favoritos', tab: null,      icon: Heart,    label: 'Favoritos' },
              ].map((item, i) => (
                item.href ? (
                  <Link key={i} href={item.href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--surface-2)'; (e.currentTarget as any).style.color = 'var(--violet-300)'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent'; (e.currentTarget as any).style.color = 'var(--text-secondary)'; }}>
                    <span className="flex items-center gap-2.5"><item.icon size={15} style={{ color: 'var(--violet-500)' }} />{item.label}</span>
                    <ChevronRight size={13} style={{ color: 'var(--text-ghost)' }} />
                  </Link>
                ) : (
                  <button key={i} onClick={() => setTab(item.tab as any)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left"
                    style={{
                      background: tab === item.tab ? 'rgba(139,92,246,0.12)' : 'transparent',
                      color: tab === item.tab ? 'var(--violet-300)' : 'var(--text-secondary)',
                      border: tab === item.tab ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
                    }}>
                    <span className="flex items-center gap-2.5"><item.icon size={15} style={{ color: tab === item.tab ? 'var(--violet-400)' : 'var(--violet-500)' }} />{item.label}</span>
                    <ChevronRight size={13} style={{ color: 'var(--text-ghost)' }} />
                  </button>
                )
              ))}

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                <button onClick={() => { logout(); router.push('/'); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
                  style={{ color: '#fca5a5' }}
                  onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(248,113,113,0.08)'}
                  onMouseLeave={e => (e.currentTarget as any).style.background = 'transparent'}>
                  <LogOut size={15} /> Sair da conta
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="md:col-span-3">
            {tab === 'info' && (
              <div className="card-elevated">
                <h3 className="font-black text-base mb-6 flex items-center gap-2"
                  style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <User size={15} style={{ color: 'var(--violet-400)' }} />
                  </div>
                  Informações Pessoais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {[
                    { key: 'name',  label: 'Nome completo', ph: 'Seu nome completo', icon: <User size={14}/>, type: 'text' },
                    { key: 'phone', label: 'Telefone',       ph: '(11) 99999-9999',  icon: <Phone size={14}/>, type: 'tel' },
                    { key: 'cpf',   label: 'CPF',            ph: '000.000.000-00',    icon: <FileText size={14}/>, type: 'text' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'name' ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                        style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>{f.label}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>{f.icon}</span>
                        <input type={f.type} value={(form as any)[f.key]}
                          onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                          placeholder={f.ph} className="input pl-10" style={{
                            height: 48,
                            background: 'rgba(139,92,246,0.08)',
                            border: '1.5px solid rgba(139,92,246,0.35)',
                            color: '#e2d9f3',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 0px rgba(139,92,246,0)',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = 'rgba(167,139,250,0.7)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15), inset 0 1px 3px rgba(0,0,0,0.2)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)';
                            e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3)';
                          }} />
                      </div>
                    </div>
                  ))}

                  {/* Email read-only */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                      <input value={user.email} disabled className="input pl-10 cursor-not-allowed" style={{
                        height: 48,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1.5px solid rgba(148,163,184,0.2)',
                        color: 'rgba(148,163,184,0.5)',
                      }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-ghost)' }}>O email não pode ser alterado</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                    Última atualização: hoje
                  </p>
                  <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-2.5">
                    {saving
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                      : <><Save size={14} /> Salvar Alterações</>}
                  </button>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="card-elevated">
                <h3 className="font-black text-base mb-6 flex items-center gap-2"
                  style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <Shield size={15} style={{ color: 'var(--violet-400)' }} />
                  </div>
                  Segurança
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(139,92,246,0.12)' }}>
                        <Lock size={16} style={{ color: 'var(--violet-400)' }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Senha</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Altere sua senha de acesso</p>
                      </div>
                    </div>
                    <Link href="/auth/esqueci-senha" className="btn-secondary text-xs px-4 py-2">
                      Alterar
                    </Link>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(139,92,246,0.12)' }}>
                        <Mail size={16} style={{ color: 'var(--violet-400)' }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Email</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full font-bold"
                      style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                      Verificado
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}