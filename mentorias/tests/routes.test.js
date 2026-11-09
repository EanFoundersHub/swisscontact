import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(moduleRoot, '..');
const read = relative => fs.readFileSync(path.join(repositoryRoot, relative));

test('Dashboard MEL raíz conserva exactamente el blob remoto', () => {
  const index = read('index.html');
  const original = read('Dashboard_Seguimiento_MEL_Swisscontact_Version_Inicial_v10.html');
  const hash = execFileSync('git', ['hash-object', path.join(repositoryRoot, 'index.html')], { encoding:'utf8' }).trim();
  assert.equal(hash, '79cc3732d7f066fa2908f7aaf116fef78cfd26cb');
  assert.deepEqual(index, original);
});

test('portal /mentorias resuelve CSS, JS y módulo core de forma relativa', () => {
  const html = read('mentorias/index.html').toString('utf8');
  const app = read('mentorias/app.js').toString('utf8');
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="app\.js"/);
  assert.match(app, /from '\.\/src\/core\.js'/);
  for (const asset of ['mentorias/styles.css','mentorias/app.js','mentorias/src/core.js']) assert.equal(fs.existsSync(path.join(repositoryRoot, asset)), true, asset);
});

test('vistas mentor y administrador permanecen separadas', () => {
  const html = read('mentorias/index.html').toString('utf8');
  assert.match(html, /id="mentorView"/);
  assert.match(html, /id="adminView"/);
  assert.match(html, /data-view="mentor"/);
  assert.match(html, /data-view="admin"/);
});

test('redirect URI MSAL apunta al subdirectorio público definitivo', () => {
  const config = read('mentorias/msal.config.example.js').toString('utf8');
  const expected = 'https://eanfoundershub.github.io/swisscontact/mentorias/';
  assert.equal(config.split(expected).length - 1, 2);
  assert.match(config, /REPLACE_WITH_TENANT_ID/);
  assert.match(config, /REPLACE_WITH_SPA_CLIENT_ID/);
});

test('Dashboard y portal abren independientemente por HTTP', async t => {
  const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript' };
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const relative = pathname === '/' ? 'index.html' : pathname === '/mentorias/' ? 'mentorias/index.html' : pathname.replace(/^\//, '');
    const resolved = path.resolve(repositoryRoot, relative);
    if (!resolved.startsWith(repositoryRoot + path.sep) || !fs.existsSync(resolved)) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(resolved)] || 'application/octet-stream' });
    fs.createReadStream(resolved).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/','/mentorias/','/mentorias/styles.css','/mentorias/app.js','/mentorias/src/core.js']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
  }
  assert.match(await (await fetch(base + '/')).text(), /Dashboard seguimiento MEL/);
  assert.match(await (await fetch(base + '/mentorias/')).text(), /Plataforma de mentorías/);
});
