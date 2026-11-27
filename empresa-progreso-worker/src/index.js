const encoder = new TextEncoder();
const ALLOWED_TYPES = {
  diagnostico: ['pdf', 'html'],
  plan: ['pdf', 'docx']
};
const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Vary': 'Origin'
};

function cors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const headers = new Headers(RESPONSE_HEADERS);
  if (origin === env.ALLOWED_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }
  return headers;
}

function json(data, status, headers) {
  const out = new Headers(headers);
  out.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers: out });
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), c => c.charCodeAt(0));
}

function encodeBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function sameSignature(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right))
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let difference = x.length ^ y.length;
  for (let index = 0; index < Math.max(x.length, y.length); index++) difference |= (x[index] || 0) ^ (y[index] || 0);
  return difference === 0;
}

async function verifyGrant(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !env.COMPANY_GRANT_SECRET) return null;
  if (!(await sameSignature(signature, await sign(payload, env.COMPANY_GRANT_SECRET)))) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    const id = String(claims.companyId || '');
    const now = Math.floor(Date.now() / 1000);
    const issuedAt = Number(claims.iat);
    if (claims.aud !== 'swc-empresa-progreso' || !Number.isFinite(claims.exp) || !Number.isFinite(issuedAt)) return null;
    if (claims.exp <= now || claims.exp <= issuedAt || claims.exp - issuedAt > 90 || issuedAt > now + 30) return null;
    if (!/^IR-(?:00[1-9]|0[12][0-9])$/.test(id) || id === 'IR-022') return null;
    return claims;
  } catch {
    return null;
  }
}

function keyFor(companyId, type, extension) {
  return `ir-${companyId.slice(3)}-${type === 'diagnostico' ? 'diagnostico' : 'plan'}.${extension}`;
}

async function findFile(env, companyId, type) {
  const extensions = ALLOWED_TYPES[type];
  if (!extensions) return null;
  for (const extension of extensions) {
    const key = keyFor(companyId, type, extension);
    const object = await env.DOCUMENTS.get(key);
    if (object) return { key, object };
  }
  return null;
}

async function progress(request, env, claims, headers) {
  const companyId = claims.companyId;
  const [diagnostico, plan, stored] = await Promise.all([
    findFile(env, companyId, 'diagnostico'),
    findFile(env, companyId, 'plan'),
    env.COMPANY_PROGRESS ? env.COMPANY_PROGRESS.get(companyId) : null
  ]);
  let extra = {};
  try { if (stored) extra = JSON.parse(stored); } catch { extra = {}; }
  const documents = [];
  for (const [type, result] of [['diagnostico', diagnostico], ['plan', plan]]) {
    if (result) documents.push({ type, updatedAt: result.object.uploaded?.toISOString?.() || null });
  }
  const bitacoras = Array.isArray(extra.bitacoras) ? extra.bitacoras.map(item => ({
    id: String(item.id || ''),
    title: String(item.title || 'Bitácora de mentoría'),
    summary: String(item.summary || ''),
    date: String(item.date || ''),
    mentor: String(item.mentor || ''),
    fileId: item.fileKey ? String(item.id || '') : ''
  })) : [];
  return json({
    companyName: String(claims.companyName || extra.companyName || 'Mi empresa').slice(0, 120),
    companyId,
    documents,
    milestones: Array.isArray(extra.milestones) ? extra.milestones : [],
    bitacoras,
    updatedAt: extra.updatedAt || null
  }, 200, headers);
}

async function deliverBitacora(env, claims, url, headers) {
  const fileId = url.searchParams.get('file') || '';
  if (!/^[a-z0-9-]{1,80}$/i.test(fileId)) return new Response('Ruta inválida', { status: 400, headers });
  const stored = env.COMPANY_PROGRESS ? await env.COMPANY_PROGRESS.get(claims.companyId) : null;
  let extra = {};
  try { if (stored) extra = JSON.parse(stored); } catch { extra = {}; }
  const record = Array.isArray(extra.bitacoras) ? extra.bitacoras.find(item => String(item.id || '') === fileId) : null;
  const key = String(record?.fileKey || '');
  if (!record || !/^bitacoras\/IR-\d{3}\/[a-z0-9._-]+\.(pdf|docx|xlsx)$/i.test(key) || !key.startsWith(`bitacoras/${claims.companyId}/`)) {
    return new Response('Bitácora no disponible', { status: 404, headers });
  }
  const object = await env.DOCUMENTS.get(key);
  if (!object) return new Response('Bitácora no disponible', { status: 404, headers });
  const contentType = key.endsWith('.pdf') ? 'application/pdf' : key.endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const filename = key.slice(key.lastIndexOf('/') + 1);
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  return new Response(object.body, { headers });
}

async function deliverDocument(request, env, claims, url, headers) {
  const type = url.searchParams.get('type');
  const file = await findFile(env, claims.companyId, type);
  if (!file) return new Response('Documento no disponible', { status: 404, headers });
  const contentType = file.key.endsWith('.pdf') ? 'application/pdf' : file.key.endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/html; charset=utf-8';
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${file.key}"`);
  return new Response(file.object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response('Método no permitido', { status: 405, headers });
    if (url.pathname === '/health') return json({ ok: true }, 200, headers);

    const claims = await verifyGrant(request, env);
    if (!claims) return json({ error: 'Sesión no válida o vencida' }, 401, headers);
    if (url.pathname === '/api/progress') return progress(request, env, claims, headers);
    if (url.pathname === '/api/document') return deliverDocument(request, env, claims, url, headers);
    if (url.pathname === '/api/bitacora') return deliverBitacora(env, claims, url, headers);
    return json({ error: 'No encontrado' }, 404, headers);
  }
};
