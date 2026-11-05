import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = new URL('../oauth-test/dist/SWC-OAUTH-IDENTITY-TEST/', import.meta.url);
const flowManifest = JSON.parse(fs.readFileSync(new URL('Microsoft.Flow/flows/manifest.json', dist), 'utf8'));
const asset = flowManifest.flowAssets.assetPaths[0];
const definition = JSON.parse(fs.readFileSync(new URL(`Microsoft.Flow/flows/${asset}/definition.json`, dist), 'utf8'));
const raw = JSON.stringify(definition);

test('flujo experimental no contiene conexiones ni operaciones de datos', () => {
  assert.deepEqual(definition.properties.connectionReferences, {});
  for (const marker of ['shared_sharepointonline','GetItems','PostItem','CreateFile','HttpRequest','DiagnosticoSiteUrl']) assert.equal(raw.includes(marker), false, marker);
});

test('respuesta experimental no expone Authorization ni headers completos', () => {
  const response = definition.properties.definition.actions.Responder_sin_token_ni_headers_completos;
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes('Authorization'), false);
  assert.equal(serialized.includes("triggerOutputs()?['headers']"), false);
});

test('flujo incluye barrera de importación para usuario TEST específico', () => {
  const trigger = definition.properties.definition.triggers.manual;
  assert.equal(trigger.metadata.swcSafetyGate, 'IMPORT_DISABLED_THEN_SET_ONE_SPECIFIC_TEST_USER');
  assert.equal(trigger.runtimeConfiguration.secureData.properties.includes('inputs'), true);
});

test('ZIP experimental fue generado', () => {
  const zip = fileURLToPath(new URL('../oauth-test/dist/SWC-OAUTH-IDENTITY-TEST.zip', import.meta.url));
  assert.equal(fs.existsSync(zip), true);
  assert.ok(fs.statSync(zip).size > 0);
});
