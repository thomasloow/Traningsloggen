// Sparar och hämtar varje användares träningsdata i Netlify Blobs.
// Inloggningen kontrolleras av Netlify Identity: utan giltig token blir det 401.
import { connectLambda, getStore } from '@netlify/blobs';

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

export const handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.sub) return json(401, { error: 'Inte inloggad' });

  connectLambda(event);
  const store = getStore('traningsloggen');
  const key = `user-${user.sub}`;

  if (event.httpMethod === 'GET') {
    const data = await store.get(key, { type: 'json' });
    return json(200, data || null);
  }

  if (event.httpMethod === 'PUT') {
    let body;
    try { body = JSON.parse(event.body || ''); } catch { return json(400, { error: 'Ogiltig JSON' }); }
    if (!body || typeof body !== 'object' || !Array.isArray(body.sessions)) return json(400, { error: 'Ogiltig data' });
    if ((event.body || '').length > 4_000_000) return json(413, { error: 'För stor' });
    await store.setJSON(key, body);
    return json(200, { ok: true, savedAt: Date.now() });
  }

  return json(405, { error: 'Metoden stöds inte' });
};
