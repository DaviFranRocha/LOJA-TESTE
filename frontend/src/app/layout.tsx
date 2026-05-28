import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || 'https://francisstore.com.br';
const SITE_NAME = 'Francis Store';
const SITE_DESC = 'Produtos digitais premium com acesso imediato. Steam Pass, Software, E-Books, Jogos e muito mais!';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Produtos Digitais Premium`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: ['produtos digitais', 'steam', 'software', 'ebooks', 'jogos', 'ferramentas digitais', 'downloads'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type:        'website',
    locale:      'pt_BR',
    url:         SITE_URL,
    siteName:    SITE_NAME,
    title:       `${SITE_NAME} — Produtos Digitais Premium`,
    description: SITE_DESC,
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    `${SITE_NAME} — Produtos Digitais`,
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       `${SITE_NAME} — Produtos Digitais Premium`,
    description: SITE_DESC,
    images:      ['/og-image.png'],
  },
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },
  icons: {
    icon:  '/favicon.ico',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="canonical" href={SITE_URL} />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-bright)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#04030a' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#04030a' } },
          }}
        />
      </body>
    </html>
  );
}