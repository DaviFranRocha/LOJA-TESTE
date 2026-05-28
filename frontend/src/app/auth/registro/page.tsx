'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm]         = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const router   = useRouter();
  const setUser  = useAuthStore(s => s.setUser);
  const setToken = useAuthStore(s => s.setToken);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setUser(data.data.user);
      setToken(data.data.accessToken);
      toast.success('Conta criada com sucesso! 🎉');
      router.push('/');
    } catch (err: any) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 409) {
        setError('Este email já está cadastrado. Tente fazer login.');
      } else {
        setError(msg || 'Erro ao criar conta. Tente novamente.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--void)' }}>
      {/* Background image */}
      <Image
        src="/login-bg.png"
        alt=""
        fill
        className="object-cover"
        style={{ opacity: 0.35 }}
        priority
        unoptimized
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(4,3,10,0.75) 0%, rgba(12,11,24,0.65) 100%)" }} />
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5" style={{ width: 160, height: 160 }}>
            <div className="absolute inset-0 rounded-3xl" style={{
              boxShadow: '0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.2)',
              borderRadius: 32,
            }} />
            <div className="absolute -inset-2 rounded-3xl opacity-30" style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent)',
              filter: 'blur(12px)',
            }} />
            <div className="relative w-full h-full rounded-3xl overflow-hidden"
              style={{ border: '2px solid rgba(167,139,250,0.4)', borderRadius: 28 }}>
              <Image src="/logo.png" alt="Francis Store" fill className="object-cover" unoptimized />
            </div>
          </div>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(196,181,253,0.4)', letterSpacing: '0.2em' }}>
            Produtos digitais premium
          </p>
        </div>

        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              Criar conta
            </h2>
            <Sparkles size={16} style={{ color: 'var(--violet-400)' }} />
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Junte-se e acesse produtos incríveis</p>

          <form onSubmit={handle} className="space-y-4">
            {[
              { key: 'name',  label: 'Nome completo', type: 'text',  ph: 'Seu nome',        icon: <User size={14} />, req: true },
              { key: 'email', label: 'Email',          type: 'email', ph: 'seu@email.com',   icon: <Mail size={14} />, req: true },
              { key: 'phone', label: 'Telefone',       type: 'tel',   ph: '(11) 99999-9999', icon: <Phone size={14}/>, req: false },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                  {f.label} {!f.req && <span style={{ color: 'var(--text-ghost)', fontWeight: 400 }}>(opcional)</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>{f.icon}</span>
                  <input type={f.type} required={f.req}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    className="input pl-10" />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-ghost)' }}>Use letras, números e caracteres especiais</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-1">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Criando conta...</>
              ) : (
                <>Criar Conta <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 divider" />
            <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>ou</span>
            <div className="flex-1 divider" />
          </div>

          <Link href="/auth/login" className="btn-secondary w-full py-3 text-sm justify-center">
            Já tenho conta — Entrar
          </Link>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-ghost)' }}>
          © {new Date().getFullYear()} Francis Store · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}