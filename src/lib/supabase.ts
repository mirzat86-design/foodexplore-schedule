// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// TODO: 把下面两个值换成你 Supabase 项目里的值：
// 1) Project URL（Settings → API → Project URL）
// 2) anon public key（Settings → API → Project API keys → anon public）
const SUPABASE_URL = 'https://cekwmssxbridsfomcjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla3dtc3N4YnJpZHNmb21janEiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyODY5NzcxNiwiZXhwIjoyMDQ0NDczNzE2fQ.S1hWdRQQv5K06nW8sVtTQmZgQypkaFlxvMMfqprBhgI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // 我们不使用 Supabase 的登录会话存储
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});