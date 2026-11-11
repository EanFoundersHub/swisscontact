import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [sourceArg, statesArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !statesArg || !outputArg) {
  console.error('Uso: node scripts/analyze-diagnostic-drafts.mjs <formulario.html> <directorio-estados> <resultado.json>');
  process.exit(1);
}

const source = readFileSync(resolve(sourceArg), 'utf8');
const statesDir = resolve(statesArg);
const output = resolve(outputArg);
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const drafts = [];

for (const entry of readdirSync(statesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  try {
    const envelope = JSON.parse(readFileSync(join(statesDir, entry.name, 'estado.json'), 'utf8'));
    if (Number(envelope.avance) >= 100 || String(envelope.empresa).startsWith('PRUEBA ')) continue;
    const state = typeof envelope.estadoJson === 'string' ? JSON.parse(envelope.estadoJson) : envelope.estadoJson;
    if (state && envelope.empresa) drafts.push({ empresa: envelope.empresa, avanceGuardado: Number(envelope.avance), state });
  } catch {}
}

const encoded = Buffer.from(JSON.stringify(drafts), 'utf8').toString('base64');
const bootstrap = `{
  try {
  const rows = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('${encoded}'), c => c.charCodeAt(0))));
  const detail = rows.map(row => {
    const state = Object.assign(E.nuevo(), row.state);
    const missing = [];
    const isPreloadPending = key => !!(state.precarga && Array.isArray(state.precarga.pendientesValidacion) && state.precarga.pendientesValidacion.includes(key));
    E.preguntas(state, null).forEach(q => {
      const base = { grupo: q.grupo, seccion: q.seccion, pregunta: q.texto };
      if (q.tipo === 'cifras') {
        q.campos.filter(c => !c.opt).forEach(c => {
          const value = state.f[c.k];
          const valid = value === 'nd' || (typeof value === 'number' && isFinite(value) && (c.neg || value >= 0));
          if (isPreloadPending(c.k) || !valid) missing.push({ ...base, detalle: c.t || c.nombre || c.k, motivo: isPreloadPending(c.k) ? 'Falta confirmar la cifra precargada' : 'Falta ingresar la cifra' });
        });
      } else if (q.tipo === 'matriz') {
        q.filas.forEach(f => { if (!(state.r[q.id] && state.r[q.id].f && state.r[q.id].f[f.k])) missing.push({ ...base, detalle: f.t || f.texto || f.k, motivo: 'Falta responder la fila' }); });
      } else if (q.tipo === 'campos') {
        const keys = Object.keys(state.g).filter(k => k.startsWith(q.id + '|') && state.g[k] !== '' && state.g[k] != null);
        let valid = keys.length > 0;
        let reason = 'Falta diligenciar los campos';
        if (valid && q.grid.suma100) {
          const sum = keys.reduce((total, key) => total + (typeof state.g[key] === 'number' ? state.g[key] : 0), 0);
          valid = Math.round(sum * 100) / 100 === 100;
          reason = 'Los porcentajes no suman 100 %';
        }
        if (!valid) missing.push({ ...base, detalle: 'Bloque de datos', motivo: reason });
      } else if (q.tipo === 'texto') {
        if (q.req && !String((state.tx || {})[q.id] || '').trim()) missing.push({ ...base, detalle: 'Respuesta escrita', motivo: 'Falta responder' });
      } else if (q.tipo === 'multi') {
        if (!(state.m[q.id] && state.m[q.id].s && state.m[q.id].s.length)) missing.push({ ...base, detalle: 'Selección', motivo: 'Falta seleccionar al menos una opción' });
      } else {
        const selected = state.r[q.id] && state.r[q.id].o;
        const requiredExtra = q.extra && E.EXTRA_REQ[q.id] ? E.EXTRA_REQ[q.id][selected] : null;
        if (!selected) missing.push({ ...base, detalle: 'Respuesta', motivo: 'Falta seleccionar una opción' });
        else if (requiredExtra && !requiredExtra.every(field => typeof state.g[q.id + 'x|' + field + '|v'] === 'number')) missing.push({ ...base, detalle: 'Dato complementario', motivo: 'Falta completar el dato requerido por la opción elegida' });
      }
    });
    const progress = E.prog(state);
    return { empresa: row.empresa, avanceGuardado: row.avanceGuardado, avanceCalculado: progress.pct, respondidas: progress.hechas, total: progress.total, faltantes: missing };
  });
  const resultBytes = new TextEncoder().encode(JSON.stringify(detail));
  let binary = ''; resultBytes.forEach(byte => binary += String.fromCharCode(byte));
  document.documentElement.setAttribute('data-draft-analysis', btoa(binary));
  } catch (error) {
    document.documentElement.setAttribute('data-draft-error', String(error && (error.stack || error.message) || error));
  }
}`;

const marker = 'void iniciar();';
if (!source.includes(marker)) throw new Error('No se encontró el punto de inicialización del formulario.');
mkdirSync(resolve(output, '..'), { recursive: true });
const temporary = join(resolve(output, '..'), '.draft-analysis.html');
writeFileSync(temporary, source.replace(marker, bootstrap), 'utf8');
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--virtual-time-budget=3000', '--dump-dom', `file:///${temporary.replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
rmSync(temporary, { force: true });
const match = dom.match(/data-draft-analysis="([A-Za-z0-9+/=]+)"/);
if (!match) {
  const error = dom.match(/data-draft-error="([^"]+)"/);
  throw new Error(error ? error[1] : 'Chrome no devolvió el análisis esperado.');
}
const result = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(`Analizados ${result.length} borradores en ${output}`);
