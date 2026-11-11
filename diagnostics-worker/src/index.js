const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'private, no-store, max-age=0'
};

let cachedKeys;
let keysExpireAt = 0;

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), character => character.charCodeAt(0));
}

async function validateAccessJwt(token, env) {
  if (!token || !env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header;
  let payload;
  try {
    header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
  } catch {
    return null;
  }
  const expectedIssuer = `https://${env.CF_ACCESS_TEAM_DOMAIN}`;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || !header.kid || payload.iss !== expectedIssuer || !audiences.includes(env.CF_ACCESS_AUD) || payload.exp <= now) return null;

  if (!cachedKeys || keysExpireAt <= Date.now()) {
    const response = await fetch(`${expectedIssuer}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!response.ok) return null;
    cachedKeys = await response.json();
    keysExpireAt = Date.now() + 60 * 60 * 1000;
  }
  const jwk = cachedKeys.keys?.find(key => key.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    fromBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  return valid ? payload : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método no permitido', { status: 405 });
    if (!url.pathname.startsWith('/reports/')) return new Response('No encontrado', { status: 404 });

    // Cloudflare Access debe proteger el dominio completo. workers.dev se desactiva
    // en wrangler.jsonc para impedir que se omita Access usando la URL alternativa.
    const accessAssertion = request.headers.get('Cf-Access-Jwt-Assertion');
    const identity = await validateAccessJwt(accessAssertion, env);
    const allowedEmails = String(env.ALLOWED_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    const email = String(identity?.email || '').toLowerCase();
    if (!identity || !email || !allowedEmails.includes(email)) return new Response('Acceso no autorizado', { status: 401 });

    const key = decodeURIComponent(url.pathname.slice('/reports/'.length));
    if (!/^[a-z0-9-]+\.html$/.test(key)) return new Response('Ruta inválida', { status: 400 });
    const object = await env.REPORTS.get(key);
    if (!object) return new Response('Informe no encontrado', { status: 404 });

    const headers = new Headers(SECURITY_HEADERS);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Content-Disposition', `inline; filename="${key}"`);
    if (object.httpEtag) headers.set('ETag', object.httpEtag);
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  }
};
