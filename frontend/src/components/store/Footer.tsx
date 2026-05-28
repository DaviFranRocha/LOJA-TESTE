import Link from 'next/link';
import ChatWidget from './ChatWidget';
import Image from 'next/image';
import { Instagram, Twitter, Mail, Download, Shield, Headphones, Zap, ExternalLink } from 'lucide-react';

export default function Footer() {
  const WHATSAPP_NUMBER = '5511999999999'; // Troque pelo seu número com DDI+DDD
  return (
    <>
    <footer style={{ background: 'var(--abyss)', borderTop: '1px solid var(--border)' }}>
      <div className="divider-neon" />

      <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-bright)', boxShadow: '0 0 15px rgba(139,92,246,0.2)' }}>
              <Image src="/logo.png" alt="Francis Store" fill className="object-contain" unoptimized />
            </div>
            <div>
              <p className="font-black text-sm tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)', letterSpacing: '0.1em' }}>FRANCIS</p>
              <p className="font-black text-sm tracking-widest text-gradient" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '0.1em' }}>STORE</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            Produtos digitais premium com acesso imediato após confirmação do pagamento.
          </p>
          <div className="flex gap-2">
            {[<Instagram size={15} key="ig"/>, <Twitter size={15} key="tw"/>, <Zap size={15} key="zap"/>].map((icon, i) => (
              <a key={i} href="#"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                onMouseEnter={e => {
                  (e.currentTarget as any).style.background = 'var(--violet-700)';
                  (e.currentTarget as any).style.color = 'white';
                  (e.currentTarget as any).style.boxShadow = '0 0 20px rgba(124,58,237,0.4)';
                  (e.currentTarget as any).style.borderColor = 'var(--violet-500)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as any).style.background = 'var(--surface-2)';
                  (e.currentTarget as any).style.color = 'var(--text-muted)';
                  (e.currentTarget as any).style.boxShadow = 'none';
                  (e.currentTarget as any).style.borderColor = 'var(--border)';
                }}>
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <h4 className="font-bold text-xs mb-5 uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>Produtos</h4>
          <ul className="space-y-3">
            {[
              ['Todos os Produtos', '/loja'],
              ['Ferramentas', '/ferramentas'],
              ['E-books', '/categoria/ebooks'],
              ['Softwares', '/categoria/software'],
              ['Templates', '/categoria/templates'],
            ].map(([l, h]) => (
              <li key={h}>
                <Link href={h}
                  className="text-sm transition-colors"
                  style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--violet-400)'}
                  onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-muted)'}>
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Account */}
        <div>
          <h4 className="font-bold text-xs mb-5 uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>Conta</h4>
          <ul className="space-y-3">
            {[
              ['Fazer Login', '/auth/login'],
              ['Criar Conta', '/auth/registro'],
              ['Minhas Compras', '/pedidos'],
              ['Meu Perfil', '/conta'],
              ['Carrinho', '/carrinho'],
            ].map(([l, h]) => (
              <li key={h}>
                <Link href={h}
                  className="text-sm transition-colors"
                  style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--violet-400)'}
                  onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-muted)'}>
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-bold text-xs mb-5 uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>Suporte</h4>
          <ul className="space-y-3 mb-6">
            <li>
              <a href="mailto:contato@franciscostore.com"
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--violet-400)'}
                onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-muted)'}>
                <Mail size={12} style={{ color: 'var(--violet-500)' }} />
                contato@franciscostore.com
              </a>
            </li>
          </ul>

          <h5 className="font-bold text-xs mb-3 uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>Pagamentos</h5>
          <div className="flex flex-wrap gap-2 mb-5">
            {[['💳', 'Cartão'], ['📱', 'PIX'], ['🏦', 'Boleto']].map(([emoji, name]) => (
              <span key={name}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                {emoji} {name}
              </span>
            ))}
          </div>

          <div className="space-y-2.5">
            {[
              [<Download size={11} key="dl"/>, 'Acesso imediato'],
              [<Shield size={11} key="sh"/>, 'Compra protegida'],
              [<Headphones size={11} key="hp"/>, 'Suporte 24h'],
            ].map(([icon, text], i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ color: 'var(--violet-500)' }}>{icon as any}</span>
                {text as string}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="divider-neon" />
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="text-xs" style={{ color: 'var(--text-ghost)', fontFamily: "'DM Sans', sans-serif" }}>
          © {new Date().getFullYear()} Francis Store. Todos os direitos reservados.
        </p>
        <div className="flex gap-5 text-xs" style={{ color: 'var(--text-ghost)', fontFamily: "'DM Sans', sans-serif" }}>
          <a href="#" className="transition-colors" onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--text-muted)'} onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-ghost)'}>Privacidade</a>
          <a href="#" className="transition-colors" onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--text-muted)'} onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text-ghost)'}>Termos de Uso</a>
        </div>
      </div>
    </footer>

    {/* WhatsApp Flutuante */}
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre um produto da Francis Store.')}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37,211,102,0.5)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as any).style.transform = 'scale(1.1)'; }}
      onMouseLeave={e => { (e.currentTarget as any).style.transform = 'scale(1)'; }}
      title="Fale conosco no WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  <ChatWidget />
  </>
  );
}