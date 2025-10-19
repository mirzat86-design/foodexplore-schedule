// Robust JSON body parsing for Vercel Node functions (supports object, string, raw stream)
function readJson(req) {
  return new Promise((resolve) => {
    // If body already exists
    if (req.body) {
      if (typeof req.body === 'object') return resolve(req.body);
      try { return resolve(JSON.parse(req.body)); } catch { /* fallthrough */ }
    }
    // Fallback: read raw stream
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await readJson(req);
  const ok = body && body.password === process.env.ADMIN_PASSWORD;
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Set-Cookie', [
    `admin_token=ok; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}Max-Age=${60 * 60 * 8}`,
  ]);
  return res.json({ ok: true });
};