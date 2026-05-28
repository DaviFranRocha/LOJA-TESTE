'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const router    = useRouter();
  const [status, setStatus]   = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get(`/auth/verify/${token}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message || 'Email verificado com sucesso!');
        setTimeout(() => router.push('/auth/login'), 3000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Token inválido ou expirado.');
      });
  }, [token]);

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
          <div className="text-center py-4">
            {status === 'loading' && (
              <>
                <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: 'var(--violet-400)' }} />
                <h2 className="text-2xl font-black mb-2"
                  style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Verificando...</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aguarde um momento.</p>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}>
                  <CheckCircle size={32} style={{ color: '#34d399' }} />
                </div>
                <h2 className="text-2xl font-black mb-2"
                  style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Email verificado!</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
                <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Redirecionando para o login...</p>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <XCircle size={32} style={{ color: '#f87171' }} />
                </div>
                <h2 className="text-2xl font-black mb-2"
                  style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Falha na verificação</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
                <Link href="/auth/login" className="btn-secondary w-full justify-center"
                  style={{ height: '52px', fontSize: '15px' }}>
                  Ir para o login
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          © {new Date().getFullYear()} Francis Store · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}