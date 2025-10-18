// Using untyped req/res to avoid requiring '@vercel/node' type package in this Expo project

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ok = req.body?.password === process.env.ADMIN_PASSWORD;
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  // 写入 HttpOnly Cookie
  res.setHeader('Set-Cookie', [
    `admin_token=ok; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}Max-Age=${60 * 60 * 8}`,
  ]);
  res.json({ ok: true });
}