/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/demo',
        destination: '/demo/',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/demo/',
        destination: 'https://novonusdemo1.vercel.app/',
      },
      {
        source: '/demo/:path*',
        destination: 'https://novonusdemo1.vercel.app/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
