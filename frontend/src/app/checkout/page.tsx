'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';
import {
  CreditCard, Smartphone, FileText, CheckCircle, Download, Lock,
  Copy, ArrowLeft, User, RefreshCw, Package, Sparkles, Check,
  ShieldCheck, Clock, ChevronRight, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

/* ── QR Code as SVG via API ────────────────────────────────── */
function QRCodeImage({ value, size = 200 }: { value: string; size?: number }) {
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    // Use qrserver.com public API — works without npm package
    setSvgUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=0a0a18&format=png`);
  }, [value, size]);

  if (!svgUrl) return (
    <div style={{ width: size, height: size, background: '#f0f0f0', borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={24} className="text-gray-400 animate-spin" />
    </div>
  );

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={svgUrl} alt="QR Code PIX" width={size} height={size}
    style={{ borderRadius: 8, display: 'block' }} />;
}

const METHODS = [
  { id: 'PIX',    label: 'PIX',    icon: <Smartphone size={18} />, desc: 'Aprovação automática e imediata', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
  { id: 'BOLETO', label: 'Boleto Bancário', icon: <FileText size={18} />, desc: 'Vencimento em 3 dias úteis', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  { id: 'STRIPE', label: 'Cartão de Crédito/Débito', icon: <CreditCard size={18} />, desc: '12x sem juros', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const user   = useAuthStore(s => s.user);
  const { items, clear } = useCartStore();

  const [products, setProducts]     = useState<Record<string, any>>({});
  const [loadingProds, setLoadingProds] = useState(true);
  const [method, setMethod]         = useState('PIX');
  const [loading, setLoading]       = useState(false);
  const [payment, setPayment]       = useState<any>(null);
  const [copied, setCopied]         = useState(false);
  const [userInfo, setUserInfo]     = useState({ fullName: '', email: '', phone: '', cpf: '' });
  const [paymentStatus, setPaymentStatus] = useState<'pending'|'polling'|'confirmed'>('pending');
  const [pollCount, setPollCount]   = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [pixCode, setPixCode]       = useState('');
  const [coupon, setCoupon]         = useState<{ code: string; discount: number } | null>(null);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    // Recupera cupom do carrinho
    try {
      const saved = sessionStorage.getItem('appliedCoupon');
      if (saved) { setCoupon(JSON.parse(saved)); }
    } catch {}

    api.get('/auth/me').then(r => {
      const u = r.data.data;
      setUserInfo({ fullName: u.name || '', email: u.email || '', phone: u.phone || '', cpf: u.cpf || '' });
    }).catch(() => {
      setUserInfo(p => ({ ...p, fullName: user.name, email: user.email }));
    });

    if (!items.length) { setLoadingProds(false); return; }
    Promise.all(
      items.map(i => api.get(`/products/id/${i.productId}`)
        .then(r => ({ id: i.productId, data: r.data.data }))
        .catch(() => ({ id: i.productId, data: null })))
    ).then(results => {
      const map: Record<string, any> = {};
      results.forEach(r => { map[r.id] = r.data; });
      setProducts(map);
    }).finally(() => setLoadingProds(false));
  }, [user]);

  // Set PIX code from server response only — never generate client-side
  useEffect(() => {
    if (payment?.method === 'PIX' && payment?.pixCode) {
      setPixCode(payment.pixCode);
    }
  }, [payment]);

  // Start polling when PIX payment created
  useEffect(() => {
    if (payment?.method === 'PIX' && payment?.orderId && paymentStatus === 'pending') {
      setPaymentStatus('polling');
      startPolling(payment.orderId);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [payment]);

  const startPolling = useCallback((orderId: string) => {
    let count = 0;
    pollingRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      try {
        const { data } = await api.get(`/payments/${orderId}`);
        const status = data.data?.status;
        if (status === 'APPROVED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Libera acesso ao produto
          try { await api.post(`/access/confirm/${orderId}`); } catch {}
          router.push(`/obrigado?orderId=${orderId}`);
          toast.success('🎉 Pagamento confirmado! Acesso liberado!');
        }
      } catch {}
      // Stop after 15 minutes (180 polls × 5s)
      if (count >= 180) {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 5000);
  }, []);

  const validItems = items.filter(i => products[i.productId] !== null && products[i.productId] !== undefined && !loadingProds);
  const subtotal   = validItems.reduce((s, i) => s + Number(products[i.productId]?.price || 0) * i.quantity, 0);
  const discountAmt = coupon?.discount || 0;
  const total       = Math.max(0, subtotal - discountAmt);

  const handleOrder = async () => {
    if (!userInfo.fullName.trim()) { toast.error('Informe seu nome completo'); return; }
    if (!userInfo.email.trim())    { toast.error('Informe seu email'); return; }
    if (validItems.length === 0)   { toast.error('Nenhum produto válido no carrinho'); return; }

    setLoading(true);
    try {
      api.patch('/users/profile', { name: userInfo.fullName, phone: userInfo.phone || undefined, cpf: userInfo.cpf || undefined }).catch(() => {});

      const orderItems = validItems.map(i => ({ productId: i.productId, quantity: i.quantity }));
      const { data: orderData } = await api.post('/orders', {
        items: orderItems,
        shipping: 0,
        couponCode: coupon?.code || undefined,
      });
      sessionStorage.removeItem('appliedCoupon'); // limpa após usar
      const { data: payData }   = await api.post('/payments', { orderId: orderData.data.id, method });

      clear();
      setPayment({
        ...payData.data,
        orderNumber: orderData.data.orderNumber,
        orderId: orderData.data.id,
        amount: orderData.data.total,
      });
      toast.success('Pedido criado! 🎉');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao criar pedido. Tente novamente.';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const copyPix = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
    } catch {
      const el = document.createElement('textarea');
      el.value = pixCode;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success('Código PIX copiado! Cole no seu banco 📱');
    setTimeout(() => setCopied(false), 4000);
  };

  // ── PIX PAYMENT CONFIRMED ──────────────────────────────────
  // ── PAYMENT CREATED (PIX/Boleto/Stripe) ───────────────────
  if (payment) return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, var(--violet-700), var(--violet-900))', boxShadow: '0 8px 25px rgba(139,92,246,0.35)' }}>
            <CheckCircle size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Pedido <span className="text-gradient">criado!</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>
            Pedido <strong className="font-mono" style={{ color: 'var(--violet-300)' }}>{payment.orderNumber}</strong>
          </p>
        </div>

        {/* PIX */}
        {payment.method === 'PIX' && pixCode && (
          <div className="animate-fade-up card-elevated mb-5"
            style={{ border: '1.5px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.03)' }}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <Smartphone size={22} style={{ color: '#34d399' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                  Pague com PIX
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-xs font-semibold" style={{ color: '#34d399' }}>Aprovação automática e imediata</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: '#34d399' }}>
                  R$ {parseFloat(payment.amount || '0').toFixed(2)}
                </p>
              </div>
            </div>

            {/* QR CODE — sempre ACIMA do código */}
            <div className="flex flex-col items-center mb-5">
              <p className="text-xs font-semibold mb-3 uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                Escaneie o QR Code
              </p>
              <div className="pix-qr-container">
                <QRCodeImage value={pixCode} size={200} />
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)', maxWidth: 220 }}>
                Abra o app do seu banco → PIX → Pagar com QR Code
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 divider" />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>ou cole o código</span>
              <div className="flex-1 divider" />
            </div>

            {/* PIX code copy */}
            <div className="rounded-xl p-3 mb-3 relative group cursor-pointer" onClick={copyPix}
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border-bright)' }}>
              <p className="font-mono text-xs break-all leading-relaxed pr-8 select-all"
                style={{ color: 'var(--text-secondary)', userSelect: 'all' }}>
                {pixCode}
              </p>
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all"
                style={{ color: copied ? '#34d399' : 'var(--text-muted)', background: 'var(--surface-2)' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            <button onClick={copyPix}
              className="w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all"
              style={{
                background: copied ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #34d399, #10b981)',
                color: 'white',
                boxShadow: copied ? '0 4px 20px rgba(5,150,105,0.4)' : '0 4px 20px rgba(52,211,153,0.35)',
                fontFamily: "'Syne', sans-serif",
                fontSize: '0.9rem',
              }}>
              {copied ? <><Check size={16} /> Código Copiado!</> : <><Copy size={16} /> Copiar Código PIX</>}
            </button>

            {/* Polling status */}
            <div className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className="text-xs" style={{ color: '#6ee7b7', fontFamily: "'DM Sans', sans-serif" }}>
                Aguardando confirmação do pagamento...
                {pollCount > 0 && <span style={{ color: 'var(--text-muted)' }}> (verificando a cada 5s)</span>}
              </p>
            </div>

            <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              💡 Após pagar, seu acesso é liberado automaticamente
            </p>
          </div>
        )}

        {/* Boleto / Stripe */}
        {(payment.method === 'BOLETO' || payment.method === 'STRIPE') && (
          <div className="card-elevated mb-5 animate-fade-up"
            style={{ border: `1.5px solid ${payment.method === 'BOLETO' ? 'rgba(251,191,36,0.25)' : 'rgba(167,139,250,0.25)'}` }}>
            <h3 className="font-black text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              {payment.method === 'BOLETO' ? '🏦 Boleto Bancário' : '💳 Pagamento com Cartão'}
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>
              {payment.method === 'BOLETO'
                ? 'Entre em contato via suporte para receber seu boleto bancário.'
                : 'Entre em contato via suporte para processar o pagamento com cartão.'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Email: <span style={{ color: 'var(--violet-400)' }}>contato@franciscostore.com</span>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/pedidos" className="btn-primary flex-1 py-3.5 font-black justify-center">
            <Package size={16} /> Meus Pedidos
          </Link>
          <Link href="/" className="btn-secondary flex-1 py-3.5 justify-center">
            Continuar
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );

  // ── CHECKOUT FORM ──────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/carrinho"
          className="inline-flex items-center gap-2 text-sm mb-6 transition-all font-medium"
          style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--violet-400)'}
          onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-muted)'}>
          <ArrowLeft size={15} /> Voltar ao carrinho
        </Link>

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
            Finalizar <span className="text-gradient">Compra</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Complete suas informações para finalizar o pedido
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left — Form */}
          <div className="md:col-span-2 space-y-5">

            {/* Personal info */}
            <div className="card-elevated animate-fade-up">
              <h2 className="text-base font-black mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.15)' }}>
                  <User size={15} style={{ color: 'var(--violet-400)' }} />
                </div>
                Seus Dados
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                    Nome Completo *
                  </label>
                  <input type="text" className="input"
                    placeholder="Seu nome completo"
                    value={userInfo.fullName}
                    onChange={e => setUserInfo({...userInfo, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                    Email *
                  </label>
                  <input type="email" className="input"
                    placeholder="seu@email.com"
                    value={userInfo.email}
                    onChange={e => setUserInfo({...userInfo, email: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                      Telefone
                    </label>
                    <input type="text" className="input"
                      placeholder="(00) 00000-0000"
                      value={userInfo.phone}
                      onChange={e => setUserInfo({...userInfo, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                      CPF
                    </label>
                    <input type="text" className="input"
                      placeholder="000.000.000-00"
                      value={userInfo.cpf}
                      onChange={e => setUserInfo({...userInfo, cpf: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="card-elevated animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-base font-black mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.15)' }}>
                  <Lock size={15} style={{ color: 'var(--violet-400)' }} />
                </div>
                Forma de Pagamento
              </h2>
              <div className="space-y-3">
                {METHODS.map(m => (
                  <div key={m.id} onClick={() => setMethod(m.id)}
                    className="p-4 rounded-xl cursor-pointer flex items-center justify-between transition-all"
                    style={{
                      background: method === m.id ? m.bg : 'var(--surface-2)',
                      border: `1.5px solid ${method === m.id ? m.border : 'var(--border)'}`,
                      boxShadow: method === m.id ? `0 0 20px ${m.bg}` : 'none',
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: method === m.id ? m.bg : 'var(--surface-3)', color: m.color, border: `1px solid ${m.border}` }}>
                        {m.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                          {m.label}
                        </h4>
                        <p className="text-xs" style={{ color: method === m.id ? m.color : 'var(--text-muted)' }}>
                          {m.desc}
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                      style={{ borderColor: method === m.id ? m.color : 'var(--text-ghost)', background: method === m.id ? m.color : 'transparent' }}>
                      {method === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* PIX info */}
              {method === 'PIX' && (
                <div className="mt-4 p-3.5 rounded-xl flex items-start gap-2.5"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <Smartphone size={15} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                      Aprovação imediata via PIX
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Gere o QR code, pague no app do seu banco e o acesso é liberado na hora.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Security */}
            <div className="flex items-center gap-3 px-1 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <ShieldCheck size={16} style={{ color: 'var(--violet-500)', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                Seus dados são protegidos com criptografia SSL de 256 bits. Não armazenamos dados de cartão.
              </p>
            </div>
          </div>

          {/* Right — Summary */}
          <div className="space-y-4">
            <div className="card-elevated animate-fade-up" style={{ animationDelay: '0.15s' }}>
              <h3 className="text-base font-black mb-4" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                Resumo da Compra
              </h3>

              {loadingProds ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
                  {validItems.map(i => {
                    const prod = products[i.productId];
                    if (!prod) return null;
                    return (
                      <div key={i.productId} className="flex items-center justify-between gap-3 py-2.5 text-sm"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>
                            {prod.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Qtd: {i.quantity}</p>
                        </div>
                        <span className="font-bold flex-shrink-0 text-sm" style={{ color: 'var(--violet-400)', fontFamily: "'Syne', sans-serif" }}>
                          R$ {(Number(prod.price) * i.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Frete</span>
                  <span className="font-bold" style={{ color: '#34d399' }}>Grátis</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#34d399' }}>🏷️ Cupom <strong>{coupon.code}</strong></span>
                    <span style={{ color: '#34d399' }}>−R$ {discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 font-black"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>Total</span>
                  <span className="text-xl text-gradient" style={{ fontFamily: "'Syne', sans-serif" }}>
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleOrder}
                disabled={loading || loadingProds || validItems.length === 0}
                className="btn-primary w-full mt-5 py-4 text-sm"
                style={{ borderRadius: '0.875rem', fontSize: '0.9rem' }}>
                {loading ? (
                  <><RefreshCw size={15} className="animate-spin" /> Processando...</>
                ) : (
                  <><Lock size={15} /> Confirmar e Pagar</>
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-4 flex items-center justify-center gap-4">
                {[
                  { icon: <ShieldCheck size={12} />, text: 'SSL Seguro' },
                  { icon: <Clock size={12} />, text: 'Acesso rápido' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--text-ghost)', fontFamily: "'DM Sans', sans-serif" }}>
                    <span style={{ color: 'var(--violet-600)' }}>{b.icon}</span>
                    {b.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}