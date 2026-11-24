const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../index.html', `file://${__dirname}/`), 'utf8');
const scripts = html.split('<script>').slice(1).map((part) => part.split('</script>')[0]);
assert.equal(scripts.length, 2, 'Se esperaban los bloques de autenticación y aplicación');

const appScript = scripts[1].split('(function(){const st=focusStage()')[0];
const filterValues = { q: '', chain: '', state: '', docf: '', docs: '' };
const document = {
  getElementById(id) {
    return {
      value: filterValues[id] ?? '',
      options: [{ text: '' }],
      selectedIndex: 0,
      classList: { add() {}, remove() {} },
      textContent: '',
    };
  },
};

const assertions = String.raw`
assert.equal(companies.length, 27, 'El tablero debe conservar las 27 empresas activas');
assert.equal(Object.keys(DIAGNOSTIC_REPORTS).length, 27, 'Cada empresa debe tener ruta de diagnóstico');
assert.equal(Object.keys(ACTION_PLANS).length, 23, 'Deben publicarse los 23 planes disponibles en el paquete nuevo');
assert.equal(Object.keys(DATA_ROOMS).length, 9, 'Deben publicarse los nueve Data Room recibidos');
assert.equal(Object.keys(COMMITMENT_LETTERS).length, 25, 'Deben conservarse 23 cartas y 2 confirmaciones sin archivo');
assert.equal(LOCKED_STAGES.size, 8, 'Solo la Etapa 0 debe estar habilitada');
assert.equal(DB_NAME, 'swisscontact_mel_inicial_v10');
assert.equal(STORE, 'docs');
assert.equal(BITSTORE, 'bitacoras');
assert.equal(STAGE_SCHEDULE.s0.activities.length, 5);
assert.ok(STAGE_SCHEDULE.s0.activities.every((activity) => activity.track === null), 'No se debe inferir una actividad contractual desde el número de sesión');

assert.ok(!STAGES.find((stage) => stage.id === 's0').docs.includes('Mapa de brechas'), 'Mapa de brechas debe retirarse del tablero');
assert.equal(docInfo('IR-010', 's0', 1).source, 'action-plan');
assert.equal(docInfo('IR-010', 's0', 1).record.file, 'plan-accion-ir-010.docx');
assert.equal(docInfo('IR-001', 's0', 1).status, 'pending', 'Un plan ausente en el paquete debe quedar pendiente');
docsMap.set(key('IR-001', 's0', 1), { name: 'plan-anterior.pdf' });
assert.equal(docInfo('IR-001', 's0', 1).status, 'pending', 'Un archivo local anterior no debe sustituir al paquete consolidado');
assert.equal(docInfo('IR-014', 's0', 0).record.file, 'diagnostico-ir-014.pdf');
assert.equal(docInfo('IR-014', 's0', 0).record.uploaded, '24/11/2026, 06:03');

const dataRoom = docInfo('IR-014', 's0', 2);
assert.equal(dataRoom.status, 'complete');
assert.equal(dataRoom.source, 'data-room');
assert.equal(dataRoom.record.modified, '20/11/2026');

const confirmedLetter = docInfo('IR-015', 's0', 3);
assert.equal(confirmedLetter.status, 'complete');
assert.equal(confirmedLetter.source, 'confirmed', 'La carta confirmada debe distinguirse del archivo disponible');

const stats = stageStats('s0', companies);
assert.equal(stats.expected, 108);
assert.equal(stats.done, 84);
assert.equal(stats.full, 7);
assert.equal(stats.per[1].complete, 23);
assert.equal(stats.per[1].partial, 0);
assert.equal(stats.per[1].pending, 4);
assert.equal(stats.per[2].complete, 9);
assert.equal(stats.per[2].pending, 18);
assert.equal(stats.per[3].complete, 25);
assert.equal(stats.per[3].pending, 2);
assert.equal(stats.local, 0, 'Los entregables administrados no deben depender de IndexedDB');
assert.equal(stats.pct, 78);

filterValues.docf = '1';
filterValues.docs = 'pending';
assert.deepEqual(Array.from(filteredCompanies('overview'), (company) => company.id), ['IR-013', 'IR-016', 'IR-018', 'IR-001']);
filterValues.docf = '';
filterValues.docs = '';
filterValues.q = 'EMPRESA INEXISTENTE';
assert.equal(filteredCompanies('overview').length, 0, 'Una combinación sin resultados debe conservar el conjunto vacío');

assert.ok(!goDetail.toString().includes('clearFilters'), 'La navegación al detalle debe conservar los filtros');
assert.ok(!html.includes('Questrial'), 'Questrial no debe adoptarse sin validación del manual de marca');
assert.ok(html.includes("indexedDB.open(DB_NAME,2)"), 'Debe conservarse la versión 2 de IndexedDB');
`;

const context = {
  assert,
  console,
  document,
  html,
  filterValues,
  setTimeout() {},
  clearTimeout() {},
  URL,
  Blob,
  Map,
  Set,
};

vm.runInNewContext(`${appScript}\n${assertions}`, context, { filename: 'index.html' });
console.log('OK dashboard-state: datos, estados, filtros, cronograma e IndexedDB');
