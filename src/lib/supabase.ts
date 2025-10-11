// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 兼容 Expo/Next 的公开环境变量前缀，并提供兜底回退值：
 * - 优先：NEXT_PUBLIC_*（Next.js Web）
 * - 次级：EXPO_PUBLIC_*（Expo 原生/Web）
 * - 最后：硬编码回退（保证即使环境变量缺失也不白屏）
 *
 * 说明：前端使用 anon key 是被允许的，数据安全由 RLS 策略保证。
 */
const FALLBACK_SUPABASE_URL = 'https://cekwmssxsbridsfomcjq.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla3dtc3N4c2JyaWRzZm9tY2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTQ0NzMsImV4cCI6MjA3NTI5MDQ3M30.cut_igebee4eLrjGh__QVlCNB-s1-aJXlVc_pLZlTmE';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  FALLBACK_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  FALLBACK_SUPABASE_ANON_KEY;

// 如果命中回退，给出一次性提示，不要让应用崩溃
if (
  (SUPABASE_URL === FALLBACK_SUPABASE_URL ||
    SUPABASE_ANON_KEY === FALLBACK_SUPABASE_ANON_KEY) &&
  typeof window !== 'undefined'
) {
  // 仅在浏览器端提示，避免服务端日志污染
  console.warn(
    '[Supabase] Using fallback URL/ANON_KEY. Consider setting EXPO_PUBLIC_/NEXT_PUBLIC_ env vars in production.'
  );
}

// 共享一个客户端（前端直连；RLS 负责权限）
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

export default supabase;