import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const packageName = process.argv[2] || 'SWC-OAUTH-IDENTITY-TEST';
const root = path.resolve(import.meta.dirname, 'dist', packageName);
const flowManifest = JSON.parse(fs.readFileSync(path.join(root, 'Microsoft.Flow', 'flows', 'manifest.json')));
const asset = flowManifest.flowAssets.assetPaths[0];
const definitionPath = path.join(root, 'Microsoft.Flow', 'flows', asset, 'definition.json');
const raw = fs.readFileSync(definitionPath, 'utf8');
const definition = JSON.parse(raw);
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

if (Object.keys(definition.properties.connectionReferences).length) throw new Error('El flujo experimental no puede tener conexiones.');
for (const forbidden of ['shared_sharepointonline', 'DiagnosticoSiteUrl', 'CreateFile', 'PostItem', 'HttpRequest', 'ProxySharedSecret']) {
  if (raw.includes(forbidden)) throw new Error(`Contenido prohibido: ${forbidden}`);
}
if (!packageManifest.details?.description?.includes('restringir manualmente a un único usuario TEST')) {
  throw new Error('Falta la barrera de configuración manual en el manifiesto.');
}
if (raw.includes("triggerOutputs()?['headers']" + "?['Authorization']\"") && raw.includes('bodyClaimedOid')) {
  // Authorization is inspected only for presence. The raw value must never be in the response mapping.
  const response = definition.properties.definition.actions.Responder_sin_token_ni_headers_completos;
  if (JSON.stringify(response).includes('Authorization')) throw new Error('La respuesta expone Authorization.');
}

const compose = definition.properties.definition.actions.Propiedades_de_identidad_observadas;
const response = definition.properties.definition.actions.Responder_sin_token_ni_headers_completos;
if (compose.type !== 'Compose' || JSON.stringify(compose.runAfter) !== '{}') {
  throw new Error('La acción Compose no tiene la forma esperada.');
}
if (response.type !== 'Response' || response.kind !== 'Http' || response.inputs?.statusCode !== 200) {
  throw new Error('La acción Response no tiene la forma esperada.');
}
if (!response.runAfter?.Propiedades_de_identidad_observadas?.includes('Succeeded')) {
  throw new Error('Response no depende del éxito de Compose.');
}

const zipPath = path.resolve(import.meta.dirname, 'dist', `${packageName}.zip`);
if (fs.existsSync(zipPath)) {
  const entries = execFileSync('tar', ['-tf', zipPath], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  if (entries.some((entry) => entry === './' || entry.startsWith('./'))) {
    throw new Error('El ZIP contiene rutas con prefijo ./ incompatibles con los paquetes de referencia.');
  }
  for (const required of ['manifest.json', 'Microsoft.Flow/flows/manifest.json']) {
    if (!entries.includes(required)) throw new Error(`Falta la entrada ZIP requerida: ${required}`);
  }
}

console.log(`OK ${packageName}: estructura, acciones, ausencia de conexiones y no exposición del bearer.`);
