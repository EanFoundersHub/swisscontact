import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname);
const dist = path.join(root, 'dist');
const sourceDir = path.join(dist, 'SWC-OAUTH-IDENTITY-TEST');
const correctedName = 'SWC-OAUTH-IDENTITY-TEST-CORREGIDO';
const correctedDir = path.join(dist, correctedName);
const correctedZip = path.join(dist, `${correctedName}.zip`);

if (!fs.existsSync(sourceDir)) {
  throw new Error(`No existe el paquete experimental fuente: ${sourceDir}`);
}

fs.rmSync(correctedDir, { recursive: true, force: true });
fs.rmSync(correctedZip, { force: true });
fs.cpSync(sourceDir, correctedDir, { recursive: true });

const manifestPath = path.join(correctedDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const resourceEntries = Object.entries(manifest.resources ?? {});
if (resourceEntries.length !== 1) {
  throw new Error('El paquete experimental debe contener exactamente un recurso de flujo.');
}
const [assetId, resource] = resourceEntries[0];

// Los dos paquetes reconocidos localmente declaran esta capacidad de importación.
resource.creationType = 'New, Update';
fs.writeFileSync(manifestPath, JSON.stringify(manifest));

const flowManifestPath = path.join(correctedDir, 'Microsoft.Flow', 'flows', 'manifest.json');
const flowManifest = JSON.parse(fs.readFileSync(flowManifestPath, 'utf8'));
if (flowManifest.packageSchemaVersion !== '1.0' || flowManifest.flowAssets?.assetPaths?.[0] !== assetId) {
  throw new Error('El manifiesto de flujos no referencia el recurso del manifiesto raíz.');
}

const definitionPath = path.join(correctedDir, 'Microsoft.Flow', 'flows', assetId, 'definition.json');
const definition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
const trigger = definition.properties.definition.triggers.manual;
const compose = definition.properties.definition.actions.Propiedades_de_identidad_observadas;
const response = definition.properties.definition.actions.Responder_sin_token_ni_headers_completos;

// Se conserva únicamente la forma observada en los paquetes que Power Automate reconoció:
// Request: type/kind/inputs; Compose: type/inputs/runAfter; Response: type/kind/runAfter/inputs.
delete trigger.metadata;
delete trigger.runtimeConfiguration;
delete compose.runtimeConfiguration;
delete response.runtimeConfiguration;

fs.writeFileSync(definitionPath, JSON.stringify(definition, null, 2));

// Incluir rutas explícitas evita las entradas "./" generadas por archivar el directorio actual.
execFileSync('tar', ['-a', '-c', '-f', correctedZip, 'manifest.json', 'Microsoft.Flow'], {
  cwd: correctedDir
});

console.log(correctedZip);
