/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS, HEAD' },
          { key: 'Access-Control-Allow-Headers', value: 'Range, Content-Type, Accept, Authorization' },
          { key: 'Access-Control-Expose-Headers', value: 'Content-Range, Content-Length, Accept-Ranges' },
        ],
      },
    ];
  },
};

export default nextConfig;
