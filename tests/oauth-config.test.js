import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('configuración MSAL de ejemplo no contiene identificadores ni secretos reales', () => {
  const source = fs.readFileSync(new URL('../web/msal.config.example.js', import.meta.url), 'utf8');
  assert.match(source, /REPLACE_WITH_TENANT_ID/);
  assert.match(source, /REPLACE_WITH_SPA_CLIENT_ID/);
  assert.doesNotMatch(source, /clientSecret|ProxySharedSecret|access[_-]?token/i);
});

test('sonda CORS no imprime Authorization ni el bearer', () => {
  const source = fs.readFileSync(new URL('../oauth-test/cors-probe.mjs', import.meta.url), 'utf8');
  assert.match(source, /tokenLogged:\s*false/);
  assert.doesNotMatch(source, /console\.log\([^)]*token/i);
});

test('configuraciones locales sensibles están ignoradas por Git', () => {
  const source = fs.readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(source, /web\/msal\.config\.js/);
  assert.match(source, /oauth-test\/\*\.local\.json/);
  assert.match(source, /\.env\.\*/);
});
