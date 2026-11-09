const COOKIE_NAME = "swc_library_session";
const SESSION_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

function normalizeNit(value) {
  return String(value || "").replace(/\D/g, "");
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function readCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

async function hasValidSession(request, secret) {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, await hmac(expires, secret));
}

function securityHeaders(headers = new Headers()) {
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return headers;
}

function loginPage(message = "") {
  const alert = message ? `<p class="alert" role="alert">${message}</p>` : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acceso | Biblioteca de inversión</title><style>
:root{font-family:Arial,sans-serif;color:#17352d;background:#f2f6f2}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#eef5ef,#fff 55%,#e5efe6)}
main{width:min(440px,100%);background:#fff;border-top:7px solid #e30613;box-shadow:0 20px 60px #17352d24;padding:38px;border-radius:4px}small{color:#5a6d66;text-transform:uppercase;letter-spacing:.12em;font-weight:700}h1{font-size:2rem;line-height:1.08;margin:.65rem 0;color:#163a31}p{line-height:1.55;color:#50635d}label{display:block;margin:1.5rem 0 .45rem;font-weight:700}input{width:100%;padding:.9rem 1rem;border:1px solid #9caaa5;border-radius:3px;font:inherit}input:focus{outline:3px solid #bedbc9;border-color:#216b4f}button{width:100%;margin-top:1rem;padding:.95rem;border:0;border-radius:3px;background:#216b4f;color:#fff;font:inherit;font-weight:700;cursor:pointer}button:hover{background:#174d3a}.alert{padding:.75rem;background:#fff1f1;color:#8c1118;border-left:4px solid #e30613}.privacy{font-size:.82rem;margin-top:1.25rem}
</style></head><body><main><small>Swisscontact · EAN Impacta</small><h1>Biblioteca de inversión</h1><p>Ingresa con el NIT registrado de tu empresa para consultar los entrenamientos y materiales.</p>${alert}<form method="post" action="/auth/login" autocomplete="off"><label for="nit">NIT de la empresa</label><input id="nit" name="nit" inputmode="numeric" autocomplete="off" required minlength="9" maxlength="14" placeholder="Ej. 900123456-7"><button type="submit">Ingresar</button></form><p class="privacy">El NIT se valida en el servidor y no se almacena en el navegador.</p></main></body></html>`;
}

function htmlResponse(html, status = 200) {
  const headers = securityHeaders(new Headers({ "Content-Type": "text/html; charset=utf-8" }));
  return new Response(html, { status, headers });
}

async function login(request, env) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });

  const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.LOGIN_RATE_LIMITER) {
    const { success } = await env.LOGIN_RATE_LIMITER.limit({ key: `login:${clientKey}` });
    if (!success) return htmlResponse(loginPage("Demasiados intentos. Espera un minuto e inténtalo de nuevo."), 429);
  }

  const form = await request.formData();
  const nit = normalizeNit(form.get("nit"));
  if (!/^\d{9,10}$/.test(nit)) return htmlResponse(loginPage("Revisa el formato del NIT e inténtalo de nuevo."), 401);

  const candidate = await hmac(nit, env.AUTH_PEPPER);
  let allowed = [];
  try { allowed = JSON.parse(env.AUTHORIZED_NIT_HASHES); } catch { return new Response("Server configuration error", { status: 500 }); }
  if (!Array.isArray(allowed) || !allowed.some((item) => typeof item === "string" && safeEqual(item, candidate))) {
    return htmlResponse(loginPage("El NIT no está autorizado para ingresar."), 401);
  }

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = `${expires}.${await hmac(String(expires), env.SESSION_SECRET)}`;
  const headers = securityHeaders(new Headers({ Location: "/" }));
  headers.append("Set-Cookie", `${COOKIE_NAME}=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`);
  return new Response(null, { status: 303, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth/login" && request.method === "POST") return login(request, env);
    if (url.pathname === "/auth/logout" && (request.method === "POST" || request.method === "GET")) {
      const headers = securityHeaders(new Headers({ Location: "/" }));
      headers.append("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
      return new Response(null, { status: 303, headers });
    }

    if (!(await hasValidSession(request, env.SESSION_SECRET))) return htmlResponse(loginPage(), 401);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response("Method not allowed", { status: 405 });

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
  },
};
