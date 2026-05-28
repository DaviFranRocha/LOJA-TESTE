'use client';
import { Suspense } from 'react';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('As senhas não conferem'); return; }
    if (password.length < 8)  { toast.error('Senha deve ter pelo menos 8 caracteres'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Link inválido ou expirado');
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
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5" style={{ width: 160, height: 160 }}>
            <div className="absolute inset-0 rounded-3xl" style={{
              boxShadow: '0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.2)', borderRadius: 32,
            }} />
            <div className="relative w-full h-full rounded-3xl overflow-hidden"
              style={{ border: '2px solid rgba(167,139,250,0.4)', borderRadius: 28 }}>
              <Image src="/logo.png" alt="Francis Store" fill className="object-cover" unoptimized />
            </div>
          </div>
        </div>

        <div className="card-elevated" style={{ padding: '2rem 2.25rem' }}>
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={32} style={{ color: '#34d399' }} />
              <h2 className="text-2xl font-black mb-2">Senha redefinida!</h2>
              <p className="text-sm">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-1">Nova senha</h2>
              <p className="text-sm mb-7">Digite sua nova senha abaixo.</p>
              <form onSubmit={handle} className="space-y-5">
                {([
                  { label: 'Nova senha', val: password, setter: setPassword, withToggle: true },
                  { label: 'Confirmar senha', val: confirm, setter: setConfirm, withToggle: false },
                ] as const).map((field, i) => (
                  <div key={i}>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">{field.label}</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" />
                      <input type={show ? 'text' : 'password'} required value={field.val}
                        onChange={e => field.setter(e.target.value)}
                        placeholder="••••••••" className="input pl-11 pr-11"
                        style={{ height: '48px', fontSize: '15px' }} />
                      {field.withToggle && (
                        <button type="button" onClick={() => setShow(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2">
                          {show ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="submit" disabled={loading || !token} className="btn-primary w-full"
                  style={{ height: '52px', fontSize: '16px', fontWeight: 700 }}>
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}