const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');

const repo = path.resolve(__dirname, '..');
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = chromeCandidates.find(fs.existsSync);
if (!chromePath) throw new Error('Google Chrome no está disponible para la prueba visual');

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function contentType(file) {
  return file.endsWith('.html') ? 'text/html; charset=utf-8'
    : file.endsWith('.js') ? 'text/javascript; charset=utf-8'
      : file.endsWith('.png') ? 'image/png'
        : 'application/octet-stream';
}

async function waitForJson(url, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chrome DevTools no respondió en ${url}`);
}

function cdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let id = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    const listeners = events.get(message.method) || [];
    listeners.splice(0).forEach((resolve) => resolve(message.params));
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    ready,
    send(method, params = {}) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    once(method) {
      return new Promise((resolve) => {
        const listeners = events.get(method) || [];
        listeners.push(resolve);
        events.set(method, listeners);
      });
    },
    close() { socket.close(); },
  };
}

async function main() {
  const webPort = await freePort();
  const debugPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'swc-dashboard-chrome-'));
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(repo, relative);
    if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(webPort, '127.0.0.1', resolve));

  const chrome = childProcess.spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });

  let client;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const page = targets.find((target) => target.type === 'page');
    assert.ok(page, 'Chrome debe exponer una página para la prueba');
    client = cdpClient(page.webSocketDebuggerUrl);
    await client.ready;
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: "sessionStorage.setItem('swc_landing_auth','1')",
    });
    const loaded = client.once('Page.loadEventFired');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/index.html` });
    await loaded;

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }

    await evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+5000;(function check(){if(document.querySelectorAll('#tabs .tab').length===10&&document.querySelector('.kpis'))resolve(true);else if(Date.now()>end)reject(new Error('El tablero no terminó de renderizar'));else setTimeout(check,50)})()})`);

    const initial = await evaluate(`({
      title:document.querySelector('h1').textContent,
      selected:document.querySelector('.tab.active .tl').textContent,
      locked:[...document.querySelectorAll('.tab.locked')].length,
      enabled:[...document.querySelectorAll('.tab:not(.locked) .tl')].map(x=>x.textContent),
      schedule:document.body.textContent.includes('Actividades del cronograma'),
      deliverables:document.body.textContent.includes('Avance de los entregables'),
      noData:[...document.querySelectorAll('.nodata')].length,
      pct:document.querySelector('.kpi-main b').textContent.trim(),
      completeText:document.querySelector('.kpi-main em').textContent.trim(),
      routeLocked:[...document.querySelectorAll('.route .is-locked')].every(x=>x.textContent.includes('Acceso no habilitado'))
    })`);
    assert.equal(initial.title, 'Dashboard de Seguimiento MEL');
    assert.equal(initial.selected, 'Resumen');
    assert.equal(initial.locked, 8);
    assert.deepEqual(initial.enabled, ['Resumen', 'Diagnóstico']);
    assert.equal(initial.schedule, true);
    assert.equal(initial.deliverables, true);
    assert.equal(initial.noData, 0);
    assert.equal(initial.pct, '47%');
    assert.equal(initial.completeText, '63 de 135 entregas completas');
    assert.equal(initial.routeLocked, true);

    const filtered = await evaluate(`(()=>{q.value='PLÁSTICOS AMBIENTALES SAS';docf.value='2';docs.value='partial';render();return {count:viewCount.textContent.trim(),partial:content.textContent.includes('Parcial'),company:content.textContent.includes('PLÁSTICOS AMBIENTALES SAS'),pct:document.querySelector('.kpi-main b').textContent.trim()}})()`);
    assert.equal(filtered.partial, true);
    assert.equal(filtered.company, true);
    assert.match(filtered.count, /^1 de 27/);
    assert.equal(filtered.pct, '40%');

    const detail = await evaluate(`(()=>{goDetail('s0',2);return {q:q.value,docf:docf.value,docs:docs.value,active:document.querySelector('.tab.active .tl').textContent,rows:document.querySelectorAll('#stageTable tbody tr').length,partial:content.textContent.includes('Plan parcial disponible')}})()`);
    assert.deepEqual(detail, { q: 'PLÁSTICOS AMBIENTALES SAS', docf: '2', docs: 'partial', active: 'Diagnóstico', rows: 1, partial: true });

    const localPartial = await evaluate(`(async()=>{await putDoc({key:key('IR-010','s0',2),company:'IR-010',stage:'s0',doc:2,name:'cierre-sin-validar.pdf',type:'application/pdf',size:1,updated:new Date().toISOString(),blob:new Blob(['x'])});await refreshDocs();render();const x=docInfo('IR-010','s0',2);return {status:x.status,source:x.source,notice:content.textContent.includes('sigue parcial hasta acreditar el cierre'),scope:document.body.textContent.includes('Datos guardados en este navegador')}})()`);
    assert.deepEqual(localPartial, { status: 'partial', source: 'local', notice: true, scope: true });

    const routes = await evaluate(`(()=>{window.__opened='';window.open=(url)=>{window.__opened=url};openActionPlan('IR-010');const plan=window.__opened;window.__opened='';openCommitmentLetter('IR-015');return {plan,confirmedOpened:window.__opened,confirmed:docInfo('IR-015','s0',4).source}})()`);
    assert.match(routes.plan, /\/reports\/plan-accion-plasticos-ambientales-parcial\.pdf$/);
    assert.equal(routes.confirmedOpened, '');
    assert.equal(routes.confirmed, 'confirmed');

    const empty = await evaluate(`(()=>{q.value='AGRONACER SAS';chain.value='Agricultura Sostenible';docf.value='';docs.value='';render();return {empty:content.textContent.includes('Sin empresas para esta combinación de filtros'),count:viewCount.textContent.trim()}})()`);
    assert.equal(empty.empty, true);
    assert.match(empty.count, /^0 de 27/);

    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate(`(()=>{q.value='';chain.value='';state.value='';docf.value='';docs.value='';current='overview';render();return true})()`);
    const mobile = await evaluate(`({
      viewport:innerWidth,
      bodyOverflow:document.documentElement.scrollWidth>innerWidth,
      toolbarColumns:getComputedStyle(document.querySelector('.toolbar')).gridTemplateColumns.split(' ').length,
      tableDisplay:getComputedStyle(document.querySelector('.tbl')).display,
      statusText:[...document.querySelectorAll('.st')].every(x=>x.textContent.trim().length>0)
    })`);
    assert.equal(mobile.viewport, 390);
    assert.equal(mobile.bodyOverflow, false);
    assert.equal(mobile.toolbarColumns, 1);
    assert.equal(mobile.tableDisplay, 'block');
    assert.equal(mobile.statusText, true);

    console.log('OK dashboard-browser: resumen, bloqueos, filtros, detalle, parcial, rutas, IndexedDB y móvil');
  } finally {
    if (client) client.close();
    if (!chrome.killed) chrome.kill();
    await Promise.race([
      new Promise((resolve) => chrome.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    await new Promise((resolve) => server.close(resolve));
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    if (!path.resolve(profile).startsWith(tempRoot)) throw new Error('Ruta temporal inesperada; se omite la limpieza');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
