/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendHost = process.env.BACKEND_HOST || '127.0.0.1';
    const backendPort = process.env.BACKEND_PORT || '5000';
    return [
      {
        source: '/api/:path*',
        destination: `http://${backendHost}:${backendPort}/api/:path*`,
      },
      {
        source: '/invoices/:path*',
        destination: `http://${backendHost}:${backendPort}/invoices/:path*`,
      },
    ];
  },
};

export default nextConfig;
