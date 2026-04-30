/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '5000' },
      { protocol: 'https', hostname: '**.onrender.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/dashboard/secretariat_office/:path*',
        destination: '/dashboard/admin/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/collector/:path*',
        destination: '/dashboard/admin/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/panchayat_secretary/:path*',
        destination: '/dashboard/admin/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/secretariat_office',
        destination: '/dashboard/admin',
        permanent: false,
      },
      {
        source: '/dashboard/collector',
        destination: '/dashboard/admin',
        permanent: false,
      },
      {
        source: '/dashboard/panchayat_secretary',
        destination: '/dashboard/admin',
        permanent: false,
      }
    ];
  },
};

export default nextConfig;
