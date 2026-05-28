/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
    domains: ['localhost', 'res.cloudinary.com', 'api.qrserver.com'],
  },
  // Rewrites removidos — o frontend usa axios apontando diretamente para NEXT_PUBLIC_API_URL
};

module.exports = nextConfig;
