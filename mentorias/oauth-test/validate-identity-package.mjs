import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, 'dist', 'SWC-OAUTH-IDENTITY-TEST');
const flowManifest = JSON.parse(fs.readFileSync(path.join(root, 'Microsoft.Flow', 'flows', 'manifest.json')));
const asset = flowManifest.flowAssets.assetPaths[0];
const definitionPath = path.join(root, 'Microsoft.Flow', 'flows', asset, 'definition.json');
const raw = fs.readFileSync(definitionPath, 'utf8');
const definition = JSON.parse(raw);

if (Object.keys(definition.properties.connectionReferences).length) throw new Error('El flujo experimental no puede tener conexiones.');
for (const forbidden of ['shared_sharepointonline', 'DiagnosticoSiteUrl', 'CreateFile', 'PostItem', 'HttpRequest', 'ProxySharedSecret']) {
  if (raw.includes(forbidden)) throw new Error(`Contenido prohibido: ${forbidden}`);
}
if (!raw.includes('IMPORT_DISABLED_THEN_SET_ONE_SPECIFIC_TEST_USER')) throw new Error('Falta la barrera de configuración manual.');
if (raw.includes("triggerOutputs()?['headers']" + "?['Authorization']\"") && raw.includes('bodyClaimedOid')) {
  // Authorization is inspected only for presence. The raw value must never be in the response mapping.
  const response = definition.properties.definition.actions.Responder_sin_token_ni_headers_completos;
  if (JSON.stringify(response).includes('Authorization')) throw new Error('La respuesta expone Authorization.');
}
console.log(`OK ${definitionPath}: sin conexiones, sin escrituras y sin exposición del bearer.`);
