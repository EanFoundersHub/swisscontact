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
assert.equal(Object.keys(ACTION_PLANS).length, 13, 'Deben conservarse los 13 planes disponibles');
assert.equal(Object.keys(DATA_ROOMS).length, 9, 'Deben publicarse los nueve Data Room recibidos');
assert.equal(Object.keys(COMMITMENT_LETTERS).length, 25, 'Deben conservarse 23 cartas y 2 confirmaciones sin archivo');
assert.equal(LOCKED_STAGES.size, 8, 'Solo la Etapa 0 debe estar habilitada');
assert.equal(DB_NAME, 'swisscontact_mel_inicial_v10');
assert.equal(STORE, 'docs');
assert.equal(BITSTORE, 'bitacoras');
assert.equal(STAGE_SCHEDULE.s0.activities.length, 5);
assert.ok(STAGE_SCHEDULE.s0.activities.every((activity) => activity.track === null), 'No se debe inferir una actividad contractual desde el número de sesión');

assert.ok(!STAGES.find((stage) => stage.id === 's0').docs.includes('Mapa de brechas'), 'Mapa de brechas debe retirarse del tablero');
assert.deepEqual(docInfo('IR-010', 's0', 1), { status: 'partial', source: 'protected' });
docsMap.set(key('IR-010', 's0', 1), { name: 'cierre-sin-validar.pdf' });
const partialWithLocalFile = docInfo('IR-010', 's0', 1);
assert.equal(partialWithLocalFile.status, 'partial', 'Una carga local no acredita por sí sola el cierre del plan parcial');
assert.equal(partialWithLocalFile.source, 'local');

const dataRoom = docInfo('IR-014', 's0', 2);
assert.equal(dataRoom.status, 'complete');
assert.equal(dataRoom.source, 'data-room');
assert.equal(dataRoom.record.modified, '20/11/2026');

const confirmedLetter = docInfo('IR-015', 's0', 3);
assert.equal(confirmedLetter.status, 'complete');
assert.equal(confirmedLetter.source, 'confirmed', 'La carta confirmada debe distinguirse del archivo disponible');

const stats = stageStats('s0', companies);
assert.equal(stats.expected, 108);
assert.equal(stats.done, 73);
assert.equal(stats.full, 4);
assert.equal(stats.per[1].complete, 12);
assert.equal(stats.per[1].partial, 1);
assert.equal(stats.per[1].pending, 14);
assert.equal(stats.per[2].complete, 9);
assert.equal(stats.per[2].pending, 18);
assert.equal(stats.per[3].complete, 25);
assert.equal(stats.per[3].pending, 2);
assert.equal(stats.local, 1, 'El indicador debe avisar cuando intervienen datos de IndexedDB');
assert.equal(stats.pct, 68);

filterValues.docf = '1';
filterValues.docs = 'partial';
assert.deepEqual(filteredCompanies('overview').map((company) => company.id), ['IR-010']);
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
