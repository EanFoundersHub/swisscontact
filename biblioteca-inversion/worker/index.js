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
  headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
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
:root{font-family:"Century Gothic","CenturyGothic","Questrial",system-ui,sans-serif;--bg:#F4F5F6;--surface:#fff;--ink:#14181C;--text:#3A4752;--muted:#5A6672;--line:#D5D9DD;--line2:#E5E8EB;--brand:#004D8B;--brand-d:#003A69;--brand-soft:#E8EFF6;--accent:#E42739;--accent-d:#B81C2C}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}.topbar{background:#fff;border-bottom:1px solid var(--line2)}.topbar-inner{width:min(1180px,calc(100% - 40px));min-height:96px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:34px}.brand-lockup{display:flex;align-items:center;gap:18px;min-width:0}.logo-ean{width:226px;height:auto;display:block}.logo-allies{width:310px;height:auto;display:block}.divider{width:1px;height:42px;background:var(--line)}.program{text-align:right}.eyebrow{display:block;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700}.program strong{display:block;margin-top:4px;color:var(--brand);font-size:20px}.accent-line{height:4px;background:linear-gradient(90deg,var(--accent) 0 34%,var(--brand) 34% 100%)}main{width:min(1180px,calc(100% - 40px));margin:auto;padding:44px 0 64px}.access-shell{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(390px,.72fr);min-height:520px;background:#fff;border:1px solid var(--line2);border-radius:6px;overflow:hidden;box-shadow:0 1px 2px rgba(20,24,28,.05)}.intro{position:relative;padding:58px 56px;background:var(--brand);color:#fff;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}.intro:after{content:"";position:absolute;right:-110px;bottom:-150px;width:390px;height:390px;border:78px solid rgba(255,255,255,.07);border-radius:50%}.intro .eyebrow{color:#D9E8F4}.intro h1{position:relative;z-index:1;max-width:620px;margin:12px 0 20px;font-size:clamp(2.5rem,5vw,4.25rem);line-height:1.02;letter-spacing:-.035em}.intro p{position:relative;z-index:1;max-width:590px;margin:0;color:#E7F0F7;font-size:1.06rem}.features{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:48px}.features div{padding:16px;border:1px solid rgba(255,255,255,.22);border-radius:5px;background:rgba(255,255,255,.07)}.features strong{display:block;font-size:1.35rem}.features span{display:block;color:#DDEAF3;font-size:.78rem}.access{padding:52px 46px;display:flex;flex-direction:column;justify-content:center;border-top:4px solid var(--accent)}.access h2{margin:7px 0 8px;color:var(--ink);font-size:2rem;line-height:1.15;letter-spacing:-.025em}.access>p{margin:0 0 22px;color:var(--muted)}label{display:block;margin:0 0 7px;color:var(--ink);font-weight:700}input{width:100%;min-height:48px;padding:11px 13px;border:1px solid #9DA7B0;border-radius:5px;background:#fff;color:var(--ink);font:inherit}input:focus{outline:3px solid #BCD2E4;border-color:var(--brand)}button{width:100%;min-height:48px;margin-top:13px;padding:11px 20px;border:1px solid var(--brand);border-radius:5px;background:var(--brand);color:#fff;font:inherit;font-weight:700;cursor:pointer}button:hover{background:var(--brand-d)}.alert{margin:0 0 18px;padding:11px 13px;border-left:4px solid var(--accent);background:#FCEAEC;color:var(--accent-d);font-size:.9rem}.privacy{display:flex;gap:9px;align-items:flex-start;margin:18px 0 0;padding-top:18px;border-top:1px solid var(--line2);color:var(--muted);font-size:.8rem}.privacy:before{content:"✓";display:grid;place-items:center;flex:0 0 20px;height:20px;border-radius:50%;background:var(--brand-soft);color:var(--brand);font-weight:800}footer{width:min(1180px,calc(100% - 40px));margin:auto;padding:0 0 28px;color:var(--muted);font-size:.78rem}footer span{color:var(--brand);font-weight:700}@media(max-width:900px){.topbar-inner{align-items:flex-start;flex-direction:column;padding:18px 0;gap:15px}.program{text-align:left}.access-shell{grid-template-columns:1fr}.intro{min-height:380px}.access{padding:42px}.features{margin-top:36px}}@media(max-width:620px){.topbar-inner,main,footer{width:calc(100% - 28px)}.brand-lockup{gap:10px}.logo-ean{width:130px}.logo-allies{width:175px}.divider{height:28px}.program strong{font-size:17px}.intro{padding:38px 28px;min-height:350px}.intro h1{font-size:2.65rem}.features{grid-template-columns:1fr}.access{padding:34px 26px}main{padding-top:24px}}
</style></head><body><header class="topbar"><div class="topbar-inner"><div class="brand-lockup"><img class="logo-ean" src="/assets/marca/ean-impacta.png" alt="Universidad Ean e Impacta"><span class="divider" aria-hidden="true"></span><img class="logo-allies" src="/assets/marca/swisscontact-aliados.png" alt="Swisscontact, Colombia más Competitiva y Embajada de Suiza en Colombia"></div><div class="program"><span class="eyebrow">Programa de Alistamiento</span><strong>Investment Readiness</strong></div></div><div class="accent-line" aria-hidden="true"></div></header><main><section class="access-shell"><div class="intro"><div><span class="eyebrow">Repositorio de aprendizaje</span><h1>Biblioteca de inversión</h1><p>Entrenamientos, conceptos clave y herramientas para preparar tu empresa para recibir inversión.</p></div><div class="features" aria-label="Contenido de la biblioteca"><div><strong>03</strong><span>entrenamientos</span></div><div><strong>06</strong><span>facilitadores</span></div><div><strong>02</strong><span>recursos</span></div></div></div><div class="access"><span class="eyebrow">Acceso empresas</span><h2>Ingresa a la biblioteca</h2><p>Utiliza el NIT registrado de tu empresa para consultar el contenido del programa.</p>${alert}<form method="post" action="/auth/login" autocomplete="off"><label for="nit">NIT de la empresa</label><input id="nit" name="nit" inputmode="numeric" autocomplete="off" required minlength="9" maxlength="14" placeholder="Ej. 900123456-7"><button type="submit">Ingresar a la biblioteca</button></form><p class="privacy">Validación protegida. El NIT no se almacena en este dispositivo.</p></div></section></main><footer><span>Swisscontact · Universidad Ean</span> — Programa de Alistamiento para la Inversión</footer></body></html>`;
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

    if (request.method === "GET" && [
      "/assets/marca/ean-impacta.png",
      "/assets/marca/swisscontact-aliados.png",
    ].includes(url.pathname)) {
      const logoResponse = await env.ASSETS.fetch(request);
      const logoHeaders = new Headers(logoResponse.headers);
      logoHeaders.set("Cache-Control", "public, max-age=86400");
      logoHeaders.set("X-Content-Type-Options", "nosniff");
      return new Response(logoResponse.body, { status: logoResponse.status, headers: logoHeaders });
    }

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
