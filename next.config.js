/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "connect-src 'self' https://cekwmssxsbridsfomcjq.supabase.co https://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;