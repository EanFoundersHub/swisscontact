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
assert.equal(Object.keys(COMMITMENT_LETTERS).length, 24, 'Deben conservarse 22 cartas y 2 confirmaciones sin archivo');
assert.equal(LOCKED_STAGES.size, 8, 'Solo la Etapa 0 debe estar habilitada');
assert.equal(DB_NAME, 'swisscontact_mel_inicial_v10');
assert.equal(STORE, 'docs');
assert.equal(BITSTORE, 'bitacoras');
assert.equal(STAGE_SCHEDULE.s0.activities.length, 5);
assert.ok(STAGE_SCHEDULE.s0.activities.every((activity) => activity.track === null), 'No se debe inferir una actividad contractual desde el número de sesión');

assert.deepEqual(docInfo('IR-010', 's0', 2), { status: 'partial', source: 'protected' });
docsMap.set(key('IR-010', 's0', 2), { name: 'cierre-sin-validar.pdf' });
const partialWithLocalFile = docInfo('IR-010', 's0', 2);
assert.equal(partialWithLocalFile.status, 'partial', 'Una carga local no acredita por sí sola el cierre del plan parcial');
assert.equal(partialWithLocalFile.source, 'local');

const confirmedLetter = docInfo('IR-015', 's0', 4);
assert.equal(confirmedLetter.status, 'complete');
assert.equal(confirmedLetter.source, 'confirmed', 'La carta confirmada debe distinguirse del archivo disponible');

const stats = stageStats('s0', companies);
assert.equal(stats.expected, 135);
assert.equal(stats.done, 63);
assert.equal(stats.full, 0);
assert.equal(stats.per[2].complete, 12);
assert.equal(stats.per[2].partial, 1);
assert.equal(stats.per[2].pending, 14);
assert.equal(stats.per[4].complete, 24);
assert.equal(stats.per[4].pending, 3);
assert.equal(stats.local, 1, 'El indicador debe avisar cuando intervienen datos de IndexedDB');
assert.equal(stats.pct, 47);

filterValues.docf = '2';
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
