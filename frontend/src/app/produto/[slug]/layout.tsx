import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/products/${params.slug}`, { next: { revalidate: 60 } });
    const data = await res.json();
    const p    = data.data;
    if (!p) return { title: 'Produto não encontrado' };
    return {
      title:       p.name,
      description: p.shortDesc || p.description?.slice(0, 160) || 'Produto digital premium na Francis Store.',
      openGraph: {
        title:       p.name,
        description: p.shortDesc || '',
        images:      p.images?.[0]?.url ? [{ url: p.images[0].url, width: 800, height: 800, alt: p.name }] : [],
        type:        'website',
      },
    };
  } catch {
    return { title: 'Produto | Francis Store' };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}