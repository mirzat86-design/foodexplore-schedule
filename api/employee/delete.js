const { createClient } = require('@supabase/supabase-js');

// Robust JSON body parsing for Vercel Node functions (supports object, string, and raw stream)
function readJson(req) {
  return new Promise((resolve) => {
    if (req.body) {
      if (typeof req.body === 'object') return resolve(req.body);
      try { return resolve(JSON.parse(req.body)); } catch { /* fallthrough */ }
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin session check via HttpOnly cookie set by /api/admin-login
  const cookie = req.headers.cookie || '';
  const isAdmin = /(^|;\s*)admin_token=ok(;|$)/.test(cookie);
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

  const body = await readJson(req);
  const id = body && body.id;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};