import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const [sourceHtmlArg, statesDirArg, outputDirArg] = process.argv.slice(2);
if (!sourceHtmlArg || !statesDirArg || !outputDirArg) {
  console.error('Uso: node scripts/generate-diagnostic-reports.mjs <formulario.html> <directorio-estados> <salida>');
  process.exit(1);
}

const sourceHtml = resolve(sourceHtmlArg);
const statesDir = resolve(statesDirArg);
const outputDir = resolve(outputDirArg);
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const template = readFileSync(sourceHtml, 'utf8');
const marker = 'void iniciar();';

if (!template.includes(marker)) {
  throw new Error(`No se encontró el punto de inicialización esperado en ${sourceHtml}`);
}

mkdirSync(outputDir, { recursive: true });

const states = [];
for (const entry of await import('node:fs/promises').then(({ readdir }) => readdir(statesDir, { withFileTypes: true }))) {
  if (!entry.isDirectory()) continue;
  const statePath = join(statesDir, entry.name, 'estado.json');
  try {
    const envelope = JSON.parse(readFileSync(statePath, 'utf8'));
    const state = typeof envelope.estadoJson === 'string' ? JSON.parse(envelope.estadoJson) : envelope.estadoJson;
    if (!state || !envelope.empresa || envelope.empresa.startsWith('PRUEBA ')) continue;
    states.push({ envelope, state });
  } catch {
    // Las carpetas de pruebas y exportaciones antiguas no siempre tienen estado.json válido.
  }
}

const slug = value => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const manifest = [];
for (const { envelope, state } of states.sort((a, b) => a.envelope.empresa.localeCompare(b.envelope.empresa, 'es'))) {
  const encoded = Buffer.from(JSON.stringify(state), 'utf8').toString('base64');
  const bootstrap = `setTimeout(() => {\n` +
    `  const bytes = Uint8Array.from(atob('${encoded}'), c => c.charCodeAt(0));\n` +
    `  const imported = JSON.parse(new TextDecoder().decode(bytes));\n` +
    `  empresaAutorizada = imported.empresa || ${JSON.stringify(envelope.empresa)};\n` +
    `  st = Object.assign(E.nuevo(), imported); cargado = true; protegerEmpresa();\n` +
    `  document.open(); document.write(reporte()); document.close();\n` +
    `}, 0);`;
  const temporary = join(outputDir, `.${slug(envelope.empresa)}.source.html`);
  const targetName = `${slug(envelope.empresa)}.html`;
  const target = join(outputDir, targetName);
  writeFileSync(temporary, template.replace(marker, bootstrap), 'utf8');
  const rendered = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--virtual-time-budget=2500', '--dump-dom', `file:///${temporary.replace(/\\/g, '/')}`
  ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(target, rendered, 'utf8');
  rmSync(temporary, { force: true });
  manifest.push({
    empresa: envelope.empresa,
    avance: Number(envelope.avance || 0),
    estado: Number(envelope.avance) === 100 ? 'final' : 'borrador',
    archivo: targetName
  });
}

writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Generados ${manifest.length} informes en ${outputDir}`);
