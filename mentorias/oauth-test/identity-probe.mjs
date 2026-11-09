import fs from 'node:fs';

const configPath = process.argv[2];
if (!configPath) {
  console.error('Uso: node oauth-test/identity-probe.mjs oauth-test/identity.local.json');
  process.exit(2);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const validToken = process.env.SWC_TEST_BEARER_TOKEN;
if (!config.endpoint || !config.expectedOid) throw new Error('Se requieren endpoint y expectedOid en el archivo local ignorado por Git.');
if (!validToken) throw new Error('Falta SWC_TEST_BEARER_TOKEN en el proceso actual.');

const fakeOid = '00000000-0000-0000-0000-000000000001';
const request = async ({ token, headers = {}, body = {} }) => {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: JSON.stringify({ operation: 'identidadOAuthTest', nonce: crypto.randomUUID(), ...body }),
    redirect: 'manual'
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
};

const cases = {
  noToken: await request({}),
  invalidToken: await request({ token: 'invalid.test.token' }),
  validToken: await request({ token: validToken }),
  fakeIdentityHeader: await request({ token: validToken, headers: { 'x-ms-client-principal-id': fakeOid, 'x-swc-authenticated-user': 'attacker@example.invalid' } }),
  fakeBodyOid: await request({ token: validToken, body: { claimedOid: fakeOid } })
};

const candidate = result => result.json?.observations?.platformCandidates ?? {};
const summary = {
  executedAt: new Date().toISOString(),
  noTokenRejected: [401, 403].includes(cases.noToken.status),
  invalidTokenRejected: [401, 403].includes(cases.invalidToken.status),
  validTokenAccepted: cases.validToken.status === 200,
  candidatesMatchExpectedOid: Object.values(candidate(cases.validToken)).some(value => String(value).toLowerCase() === config.expectedOid.toLowerCase()),
  fakePlatformHeaderEchoed: Object.values(candidate(cases.fakeIdentityHeader)).some(value => String(value).toLowerCase() === fakeOid),
  fakeCustomHeaderMarkedUntrusted: cases.fakeIdentityHeader.json?.observations?.untrustedEchoes?.customIdentityHeader === 'attacker@example.invalid',
  fakeBodyOidMarkedUntrusted: cases.fakeBodyOid.json?.observations?.untrustedEchoes?.bodyClaimedOid === fakeOid,
  statuses: Object.fromEntries(Object.entries(cases).map(([name, value]) => [name, value.status])),
  tokenLogged: false,
  endpointLogged: false,
  expectedOidLogged: false
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.noTokenRejected || !summary.invalidTokenRejected || !summary.validTokenAccepted || summary.fakePlatformHeaderEchoed) process.exitCode = 1;
