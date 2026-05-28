'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm]         = useState({ email: '', password: '' });
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const router   = useRouter();
  const setUser  = useAuthStore(s => s.setUser);
  const setToken = useAuthStore(s => s.setToken);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setUser(data.data.user);
      setToken(data.data.accessToken);
      toast.success('Bem-vindo de volta! 👋');
      if (['ADMIN','SUPER_ADMIN','GERENTE'].includes(data.data.user.role)) router.push('/admin');
      else router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou senha incorretos');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#04030a' }}>

      {/* Background */}
      <Image src="/login-bg.png" alt="" fill className="object-cover" style={{ opacity: 0.25 }} unoptimized priority />

      {/* Gradients */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(109,40,217,0.3) 0%, transparent 60%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(76,29,149,0.15) 0%, transparent 60%)' }} />

      {/* Form centered */}
      <div className="w-full max-w-md px-4 relative z-10">

          {/* Logo mobile */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-4" style={{ width: 120, height: 120 }}>
              <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: '0 0 50px rgba(139,92,246,0.5)', borderRadius: 24 }} />
              <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(167,139,250,0.4)', borderRadius: 22 }}>
                <Image src="/logo.png" alt="Francis Store" fill className="object-cover" unoptimized />
              </div>
            </div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(196,181,253,0.4)', letterSpacing: '0.2em' }}>Produtos digitais premium</p>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 24, padding: '2.5rem' }}>

            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-black mb-1" style={{ fontFamily: "'Syne', sans-serif", color: '#ffffff' }}>
                Bem-vindo
              </h1>
              <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>Acesse sua conta para continuar</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
                <span className="text-base flex-shrink-0">⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handle} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(196,181,253,0.5)', fontFamily: "'Syne', sans-serif", letterSpacing: '0.12em' }}>
                  Email
                </label>
                <input type="email" required value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
                  placeholder="seu@email.com"
                  style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, fontSize: 15, outline: 'none', background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.2)', color: '#e2d9f3', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'} />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(196,181,253,0.5)', fontFamily: "'Syne', sans-serif", letterSpacing: '0.12em' }}>
                    Senha
                  </label>
                  <Link href="/auth/esqueci-senha" className="text-xs font-medium transition-colors"
                    style={{ color: '#7c3aed' }}
                    onMouseEnter={e => (e.currentTarget as any).style.color = '#a78bfa'}
                    onMouseLeave={e => (e.currentTarget as any).style.color = '#7c3aed'}>
                    Esqueci a senha
                  </Link>
                </div>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                    placeholder="••••••••"
                    style={{ width: '100%', height: 52, padding: '0 48px 0 16px', borderRadius: 14, fontSize: 15, outline: 'none', background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.2)', color: '#e2d9f3', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(196,181,253,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as any).style.color = '#a78bfa'}
                    onMouseLeave={e => (e.currentTarget as any).style.color = 'rgba(196,181,253,0.4)'}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 font-black transition-all relative overflow-hidden"
                style={{ height: 54, borderRadius: 14, fontSize: 16, fontFamily: "'Syne', sans-serif", letterSpacing: '0.04em', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)', color: 'white', boxShadow: loading ? 'none' : '0 8px 32px rgba(124,58,237,0.5)', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as any).style.boxShadow = '0 0 40px rgba(139,92,246,0.7), 0 8px 32px rgba(124,58,237,0.5)'; (e.currentTarget as any).style.filter = 'brightness(1.1)'; }}}
                onMouseLeave={e => { (e.currentTarget as any).style.boxShadow = '0 8px 32px rgba(124,58,237,0.5)'; (e.currentTarget as any).style.filter = 'none'; }}>
                {loading
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entrando...</>
                  : <>Entrar <ArrowRight size={18} /></>}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1" style={{ height: 1, background: 'rgba(139,92,246,0.15)' }} />
              <span className="text-xs" style={{ color: 'rgba(196,181,253,0.3)' }}>ou</span>
              <div className="flex-1" style={{ height: 1, background: 'rgba(139,92,246,0.15)' }} />
            </div>

            <Link href="/auth/registro"
              className="w-full flex items-center justify-center gap-2 font-bold transition-all"
              style={{ height: 52, borderRadius: 14, fontSize: 15, border: '1.5px solid rgba(139,92,246,0.25)', color: 'rgba(196,181,253,0.7)', background: 'transparent', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'rgba(139,92,246,0.5)'; (e.currentTarget as any).style.color = '#c4b5fd'; (e.currentTarget as any).style.background = 'rgba(139,92,246,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'rgba(139,92,246,0.25)'; (e.currentTarget as any).style.color = 'rgba(196,181,253,0.7)'; (e.currentTarget as any).style.background = 'transparent'; }}>
              Criar conta →
            </Link>
          </div>
      </div>
    </div>
  );
}