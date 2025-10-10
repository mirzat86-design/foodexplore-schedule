// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// 从 Vercel/本地环境变量读取（浏览器可用：需以 NEXT_PUBLIC_ 前缀暴露）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 便捷的运行时检查，防止部署时忘了配置变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Missing Supabase env vars. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (Vercel → Project → Settings → Environment Variables).'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // 不使用 Supabase 的本地会话存储
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});