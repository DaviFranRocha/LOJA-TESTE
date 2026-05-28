import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden"
      style={{ background: 'var(--void)' }}>
      {/* Bg glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="absolute inset-0 neon-grid opacity-30" />

      <div className="relative z-10 animate-fade-up">
        {/* 404 */}
        <p className="text-[8rem] md:text-[10rem] font-black leading-none"
          style={{
            fontFamily: "'Syne', sans-serif",
            background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 40%, #9d6fff 70%, #e879f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(157,111,255,0.3))',
          }}>
          404
        </p>

        <h1 className="text-2xl md:text-3xl font-black mb-3 -mt-4"
          style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
          Página não encontrada
        </h1>
        <p className="text-sm md:text-base mb-8 max-w-sm mx-auto"
          style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
          A página que você procura não existe ou foi movida.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="btn-primary px-6 py-3 font-bold">
            <Home size={16} /> Ir para Home
          </Link>
          <Link href="/loja" className="btn-secondary px-6 py-3 font-bold">
            <Search size={16} /> Ver Produtos
          </Link>
        </div>
      </div>
    </div>
  );
}