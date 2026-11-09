import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
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

test('ZIP corregido usa la raíz del formato reconocido', () => {
  const zip = fileURLToPath(new URL('../oauth-test/dist/SWC-OAUTH-IDENTITY-TEST-CORREGIDO.zip', import.meta.url));
  const entries = execFileSync('tar', ['-tf', zip], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  assert.equal(entries.includes('manifest.json'), true);
  assert.equal(entries.includes('Microsoft.Flow/flows/manifest.json'), true);
  assert.equal(entries.some((entry) => entry === './' || entry.startsWith('./')), false);
});

test('definición corregida conserva referencias coherentes y acciones válidas', () => {
  const corrected = new URL('../oauth-test/dist/SWC-OAUTH-IDENTITY-TEST-CORREGIDO/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', corrected), 'utf8'));
  const correctedFlowManifest = JSON.parse(fs.readFileSync(new URL('Microsoft.Flow/flows/manifest.json', corrected), 'utf8'));
  const correctedAsset = correctedFlowManifest.flowAssets.assetPaths[0];
  const resource = manifest.resources[correctedAsset];
  const correctedDefinition = JSON.parse(fs.readFileSync(new URL(`Microsoft.Flow/flows/${correctedAsset}/definition.json`, corrected), 'utf8'));
  const actions = correctedDefinition.properties.definition.actions;

  assert.equal(resource.type, 'Microsoft.Flow/flows');
  assert.equal(resource.creationType, 'New, Update');
  assert.deepEqual(resource.dependsOn, []);
  assert.deepEqual(correctedDefinition.properties.connectionReferences, {});
  assert.equal(actions.Propiedades_de_identidad_observadas.type, 'Compose');
  assert.deepEqual(actions.Propiedades_de_identidad_observadas.runAfter, {});
  assert.equal(actions.Responder_sin_token_ni_headers_completos.type, 'Response');
  assert.equal(actions.Responder_sin_token_ni_headers_completos.kind, 'Http');
  assert.deepEqual(actions.Responder_sin_token_ni_headers_completos.runAfter, {
    Propiedades_de_identidad_observadas: ['Succeeded']
  });
});
