/** @type {import('next').NextConfig} */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let SUPABASE_HOST = '';
try {
  SUPABASE_HOST = new URL(SUPABASE_URL).host; // e.g. cekwmssxsbridsfomcjq.supabase.co
} catch (e) {
  // leave empty – we'll fall back to wildcard host below
}

// A safe, minimal CSP that allows your app to call Supabase (HTTP + WebSocket)
const CSP = [
  "default-src 'self'",
  SUPABASE_HOST
    ? `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`
    : "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "img-src * blob: data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src 'self' https://*.supabase.co",
  "base-uri 'self'",
].join('; ');

const nextConfig = {
  // 显式注入环境变量，确保在构建时打包进入客户端
  env: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

module.exports = nextConfig;