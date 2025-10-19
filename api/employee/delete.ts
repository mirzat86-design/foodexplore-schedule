import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.body?.id
  if (!id) return res.status(400).json({ error: 'id required' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { error } = await supabase.from('employees').delete().eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}