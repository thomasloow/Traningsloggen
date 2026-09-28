// Bilder till egna övningar. Uppladdning och borttagning kräver inloggning.
// Visning sker via en lång slumpad nyckel, så att <img> kan visa bilden utan inloggningshuvud.
import { connectLambda, getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const validKey = k => /^[a-f0-9-]{36}$/.test(k || '');

export const handler = async (event, context) => {
  connectLambda(event);
  const store = getStore('traningsloggen-foton');
  const k = event.queryStringParameters && event.queryStringParameters.k;

  if (event.httpMethod === 'GET') {
    if (!validKey(k)) return json(400, { error: 'Ogiltig nyckel' });
    const buf = await store.get(k, { type: 'arrayBuffer' });
    if (!buf) return json(404, { error: 'Bilden finns inte' });
    return { statusCode: 200, headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }, body: Buffer.from(buf).toString('base64'), isBase64Encoded: true };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.sub) return json(401, { error: 'Inte inloggad' });

  if (event.httpMethod === 'POST') {
    let data;
    try { data = JSON.parse(event.body || '{}').data; } catch { return json(400, { error: 'Ogiltig JSON' }); }
    if (typeof data !== 'string' || data.length < 100 || data.length > 4_000_000) return json(400, { error: 'Ogiltig bild' });
    const b = Buffer.from(data, 'base64');
    const key = randomUUID();
    await store.set(key, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), { metadata: { owner: user.sub, at: Date.now() } });
    return json(200, { k: key });
  }

  if (event.httpMethod === 'DELETE') {
    if (!validKey(k)) return json(400, { error: 'Ogiltig nyckel' });
    const meta = await store.getMetadata(k);
    if (meta && meta.metadata && meta.metadata.owner === user.sub) await store.delete(k);
    return json(200, { ok: true });
  }

  return json(405, { error: 'Metoden stöds inte' });
};
