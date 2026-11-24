const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(repo, 'diagnostics-worker', 'src', 'index.js'), 'utf8');

assert.ok(!html.includes("'Mapa de brechas'"), 'El entregable Mapa de brechas debe estar retirado');
assert.match(html, /const DATA_ROOMS=\{[\s\S]*?\};/);
assert.equal((html.match(/file:'data-room-[^']+\.xlsx'/g) || []).length, 9, 'Deben existir nueve rutas Data Room');
assert.equal((html.match(/modified:'\d{2}\/\d{2}\/2026'/g) || []).length, 9, 'Cada Data Room debe mostrar última edición');
assert.ok(html.includes("window.open(`${base}/reports/${encodeURIComponent(item.file)}`"), 'Los libros deben abrirse mediante el Worker protegido');
assert.ok(!fs.existsSync(path.join(repo, 'data-room-huevos-san-nicolas.xlsx')), 'Los Excel no deben publicarse en GitHub Pages');

assert.ok(worker.includes("(html|pdf|xlsx)"), 'El Worker debe aceptar exclusivamente las extensiones protegidas previstas');
assert.ok(worker.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'El Worker debe declarar el MIME de Excel');
assert.ok(worker.includes("isSpreadsheet ? 'attachment' : 'inline'"), 'Los Excel deben descargarse como adjuntos');
assert.ok(worker.includes("const session = await readSession(request, env)"), 'La descarga debe conservar la validación de sesión');

console.log('OK data-room-security: nueve libros, fechas, rutas protegidas y descarga XLSX');
