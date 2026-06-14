/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/demo',
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
