'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      setError('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao enviar email';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: '#04030a' }}>
      <Image src="/login-bg.png" alt="" fill className="object-cover" style={{ opacity: 0.35 }} unoptimized />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(4,3,10,0.75),rgba(12,11,24,0.65))' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(109,40,217,0.25),transparent)', opacity: 0.8 }} />

      <div className="relative z-10 w-full max-w-md">
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

        <div className="card-elevated" style={{ padding: '2rem 2.25rem' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <CheckCircle size={32} style={{ color: '#34d399' }} />
              </div>
              <h2 className="text-2xl font-black mb-2"
                style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Email enviado!</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Se esse email estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
              </p>
              <Link href="/auth/login" className="btn-secondary w-full justify-center"
                style={{ height: '52px', fontSize: '15px' }}>
                <ArrowLeft size={16} /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-1"
                style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                Esqueci a senha
              </h2>
              <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>
                Informe seu email e enviaremos as instruções para redefinir sua senha.
              </p>
              <form onSubmit={handle} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" className="input pl-11"
                      style={{ height: '48px', fontSize: '15px' }} />
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                    ⚠️ {error}
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full"
                  style={{ height: '52px', fontSize: '16px', fontWeight: 700 }}>
                  {loading
                    ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                    : <><Send size={16} /> Enviar instruções</>}
                </button>
              </form>
              <Link href="/auth/login"
                className="flex items-center justify-center gap-2 mt-5 text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--violet-400)'}
                onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-muted)'}>
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          © {new Date().getFullYear()} Francis Store · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}