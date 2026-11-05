import fs from 'node:fs';

const configPath = process.argv[2];
if (!configPath) {
  console.error('Uso: node oauth-test/cors-probe.mjs oauth-test/probe.local.json');
  process.exit(2);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = process.env.SWC_TEST_BEARER_TOKEN;
if (!config.endpoint || !config.origin) throw new Error('La configuración requiere endpoint y origin.');
if (!token) throw new Error('Defina SWC_TEST_BEARER_TOKEN solo en el proceso actual. No lo escriba en archivos.');

const allowedResponseHeaders = new Set([
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'vary',
  'content-type',
  'x-ms-workflow-run-id',
  'x-ms-correlation-request-id'
]);

function safeHeaders(headers) {
  return Object.fromEntries([...headers.entries()].filter(([name]) => allowedResponseHeaders.has(name.toLowerCase())));
}

async function request(method, headers, body) {
  const response = await fetch(config.endpoint, { method, headers, body, redirect: 'manual' });
  return { status: response.status, headers: safeHeaders(response.headers) };
}

const preflight = await request('OPTIONS', {
  Origin: config.origin,
  'Access-Control-Request-Method': 'POST',
  'Access-Control-Request-Headers': 'authorization,content-type'
});

const post = await request('POST', {
  Origin: config.origin,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
}, JSON.stringify(config.body ?? { operation: 'identidadOAuthTest' }));

const allowsOrigin = preflight.headers['access-control-allow-origin'];
const allowsAuthorization = (preflight.headers['access-control-allow-headers'] || '').toLowerCase().includes('authorization');
const result = {
  executedAt: new Date().toISOString(),
  origin: config.origin,
  preflight,
  post,
  cors: {
    originAccepted: allowsOrigin === '*' || allowsOrigin === config.origin,
    authorizationHeaderAccepted: allowsAuthorization,
    viable: (allowsOrigin === '*' || allowsOrigin === config.origin) && allowsAuthorization && preflight.status >= 200 && preflight.status < 300
  },
  tokenLogged: false
};

console.log(JSON.stringify(result, null, 2));
if (!result.cors.viable || post.status === 401 || post.status === 403) process.exitCode = 1;
