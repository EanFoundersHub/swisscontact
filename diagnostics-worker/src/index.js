const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, no-store, max-age=0'
};

const encoder = new TextEncoder();
const LANDING_URL = 'https://eanfoundershub.github.io/swisscontact/';

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), character => character.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function sameSecret(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right))
  ]);
  const leftDigest = base64Url(new Uint8Array(a));
  const rightDigest = base64Url(new Uint8Array(b));
  let difference = leftDigest.length ^ rightDigest.length;
  for (let index = 0; index < Math.max(leftDigest.length, rightDigest.length); index++) {
    difference |= (leftDigest.charCodeAt(index) || 0) ^ (rightDigest.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function allowedEmails(env) {
  return String(env.ALLOWED_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
}

function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const entry = cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : '';
}

async function createSession(email, env) {
  const hours = Math.min(Math.max(Number(env.SESSION_DURATION_HOURS) || 12, 1), 168);
  const payload = base64Url(encoder.encode(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + hours * 3600 })));
  return `${payload}.${await hmac(payload, env.SESSION_SECRET)}`;
}

async function readSession(request, env) {
  const token = cookieValue(request, 'swc_session');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !env.SESSION_SECRET) return null;
  if (!(await sameSecret(signature, await hmac(payload, env.SESSION_SECRET)))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (!data.email || data.exp <= Math.floor(Date.now() / 1000) || !allowedEmails(env).includes(String(data.email).toLowerCase())) return null;
    return data;
  } catch {
    return null;
  }
}

function safeRedirect(value) {
  if (typeof value !== 'string' || value.startsWith('//')) return '/auth/start';
  if (value.startsWith('/reports/') || value === '/auth/start') return value;
  return '/auth/start';
}

async function createLandingGrant(email, env) {
  const payload = base64Url(encoder.encode(JSON.stringify({ email, typ: 'landing', exp: Math.floor(Date.now() / 1000) + 90 })));
  return `${payload}.${await hmac(payload, env.SESSION_SECRET)}`;
}

async function verifyLandingGrant(token, env) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra || !env.SESSION_SECRET) return null;
  if (!(await sameSecret(signature, await hmac(payload, env.SESSION_SECRET)))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (data.typ !== 'landing' || data.exp <= Math.floor(Date.now() / 1000) || !allowedEmails(env).includes(String(data.email || '').toLowerCase())) return null;
    return data;
  } catch { return null; }
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return origin === new URL(LANDING_URL).origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' } : { 'Cache-Control': 'no-store' };
}

function html(value, status = 200, extraHeaders = {}) {
  return new Response(value, { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders } });
}

function loginPage(redirect, error = '') {
  const message = error ? `<div class="error">${error}</div>` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso · Swisscontact</title><style>
  :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d10;color:#f4f6f8;font-family:Inter,system-ui,sans-serif}.card{width:min(92vw,430px);padding:34px;border:1px solid #30343a;border-radius:16px;background:#15181c;box-shadow:0 24px 70px #0008}.brand{font-size:14px;color:#aab2bd;margin-bottom:28px}h1{font-size:26px;margin:0 0 8px}.sub{color:#aab2bd;line-height:1.45;margin-bottom:24px}label{display:block;font-size:14px;font-weight:700;margin:15px 0 7px}input{width:100%;padding:13px 14px;border:1px solid #3a4048;border-radius:10px;background:#0f1215;color:#fff;font-size:16px;outline:none}input:focus{border-color:#e33b35;box-shadow:0 0 0 3px #e33b3525}button{width:100%;margin-top:22px;padding:13px;border:0;border-radius:10px;background:#e33b35;color:#fff;font-size:16px;font-weight:800;cursor:pointer}.error{margin:0 0 18px;padding:11px 12px;border-radius:9px;background:#5b1d1d;color:#ffd8d8;font-size:14px}.foot{margin-top:18px;color:#7f8995;font-size:12px;text-align:center}</style></head><body><main class="card"><div class="brand">Swisscontact · EAN Impacta</div><h1>Ingreso seguro</h1><div class="sub">Usa tu correo autorizado y la clave del programa.</div>${message}<form method="post" action="/auth/login"><input type="hidden" name="redirect" value="${redirect.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="username" required autofocus><label for="password">Clave</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Ingresar</button></form><div class="foot">Acceso exclusivo para usuarios autorizados</div></main></body></html>`;
}

async function handleLogin(request, env, url) {
  if (request.method === 'GET') return html(loginPage(safeRedirect(url.searchParams.get('redirect'))));
  if (request.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  if (!env.AUTH_PASSWORD || !env.SESSION_SECRET) return html(loginPage('/', 'El acceso no está configurado.'), 503);
  const form = await request.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const redirect = safeRedirect(String(form.get('redirect') || ''));
  const validEmail = allowedEmails(env).includes(email);
  const validPassword = await sameSecret(password, env.AUTH_PASSWORD);
  if (!validEmail || !validPassword) return html(loginPage(redirect, 'Correo o clave incorrectos.'), 401);
  const token = await createSession(email, env);
  const hours = Math.min(Math.max(Number(env.SESSION_DURATION_HOURS) || 12, 1), 168);
  return new Response(null, { status: 303, headers: { Location: redirect, 'Set-Cookie': `swc_session=${token}; Path=/; Max-Age=${hours * 3600}; HttpOnly; Secure; SameSite=Lax`, ...SECURITY_HEADERS } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth/login') return handleLogin(request, env, url);
    if (url.pathname === '/auth/start') {
      const session = await readSession(request, env);
      if (!session) return new Response(null, { status: 302, headers: { Location: '/auth/login?redirect=%2Fauth%2Fstart', ...SECURITY_HEADERS } });
      const grant = await createLandingGrant(session.email, env);
      return new Response(null, { status: 303, headers: { Location: `${LANDING_URL}#swc_grant=${encodeURIComponent(grant)}`, ...SECURITY_HEADERS } });
    }
    if (url.pathname === '/auth/verify') {
      const headers = corsHeaders(request);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (request.method !== 'GET') return new Response('Método no permitido', { status: 405, headers });
      const grant = await verifyLandingGrant(url.searchParams.get('token'), env);
      return new Response(JSON.stringify({ authorized: Boolean(grant) }), { status: grant ? 200 : 401, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
    }
    if (url.pathname === '/auth/logout') return new Response(null, { status: 303, headers: { Location: LANDING_URL, 'Set-Cookie': 'swc_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax', ...SECURITY_HEADERS } });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método no permitido', { status: 405 });
    if (!url.pathname.startsWith('/reports/')) return new Response('No encontrado', { status: 404 });

    const session = await readSession(request, env);
    if (!session) {
      const redirect = encodeURIComponent(`${url.pathname}${url.search}`);
      return new Response(null, { status: 302, headers: { Location: `/auth/login?redirect=${redirect}`, ...SECURITY_HEADERS } });
    }

    const key = decodeURIComponent(url.pathname.slice('/reports/'.length));
    if (!/^[a-z0-9-]+\.(html|pdf)$/.test(key)) return new Response('Ruta inválida', { status: 400 });
    const object = await env.REPORTS.get(key);
    if (!object) return new Response('Informe no encontrado', { status: 404 });

    const headers = new Headers(SECURITY_HEADERS);
    headers.set('Content-Type', key.endsWith('.pdf') ? 'application/pdf' : 'text/html; charset=utf-8');
    headers.set('Content-Disposition', `inline; filename="${key}"`);
    if (key.endsWith('.pdf')) headers.set('Content-Security-Policy', "default-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none'");
    if (object.httpEtag) headers.set('ETag', object.httpEtag);
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  }
};
