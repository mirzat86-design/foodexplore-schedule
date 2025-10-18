// Using untyped req/res to avoid requiring '@vercel/node' type package in this Expo project
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cookie = req.headers.cookie || '';
  const isAdmin = /(^|;\s*)admin_token=ok(;|$)/.test(cookie);
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = (req.body as any) || {};
  if (!id) return res.status(400).json({ error: 'id required' });

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
}