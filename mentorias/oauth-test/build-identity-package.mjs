import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname);
const output = path.join(root, 'dist');
const name = 'SWC-OAUTH-IDENTITY-TEST';
const assetId = crypto.randomUUID();
const flowId = crypto.randomUUID();
const packageDir = path.join(output, name);
const flowDir = path.join(packageDir, 'Microsoft.Flow', 'flows', assetId);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(flowDir, { recursive: true });

const definition = {
  name: flowId,
  id: `/providers/Microsoft.Flow/flows/${flowId}`,
  type: 'Microsoft.Flow/flows',
  properties: {
    apiId: '/providers/Microsoft.PowerApps/apis/shared_logicflows',
    displayName: name,
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      parameters: {
        $authentication: { defaultValue: {}, type: 'SecureObject' },
        $connections: { defaultValue: {}, type: 'Object' }
      },
      triggers: {
        manual: {
          type: 'Request',
          kind: 'Http',
          metadata: {
            swcSafetyGate: 'IMPORT_DISABLED_THEN_SET_ONE_SPECIFIC_TEST_USER',
            swcPurpose: 'OID_AND_CORS_EXPERIMENT_ONLY'
          },
          inputs: {
            schema: {
              type: 'object',
              properties: {
                operation: { type: 'string', enum: ['identidadOAuthTest'] },
                claimedOid: { type: ['string', 'null'] },
                nonce: { type: ['string', 'null'] }
              },
              required: ['operation'],
              additionalProperties: false
            },
            // The exported schema for the per-user allow-list was not present in
            // any verified local package. Configure "Specific users in my tenant"
            // and exactly one TEST user in the designer before enabling this flow.
            triggerAuthenticationType: 'Tenant'
          },
          runtimeConfiguration: { secureData: { properties: ['inputs', 'outputs'] } }
        }
      },
      actions: {
        Propiedades_de_identidad_observadas: {
          type: 'Compose',
          runAfter: {},
          inputs: {
            authorizationPresent: "@not(empty(triggerOutputs()?['headers']?['Authorization']))",
            platformCandidates: {
              xMsClientPrincipalId: "@coalesce(triggerOutputs()?['headers']?['x-ms-client-principal-id'], triggerOutputs()?['headers']?['X-MS-CLIENT-PRINCIPAL-ID'])",
              xMsClientPrincipalName: "@coalesce(triggerOutputs()?['headers']?['x-ms-client-principal-name'], triggerOutputs()?['headers']?['X-MS-CLIENT-PRINCIPAL-NAME'])",
              xMsUserId: "@coalesce(triggerOutputs()?['headers']?['x-ms-user-id'], triggerOutputs()?['headers']?['X-MS-USER-ID'])",
              xMsUserName: "@coalesce(triggerOutputs()?['headers']?['x-ms-user-name'], triggerOutputs()?['headers']?['X-MS-USER-NAME'])"
            },
            untrustedEchoes: {
              customIdentityHeader: "@triggerOutputs()?['headers']?['x-swc-authenticated-user']",
              bodyClaimedOid: "@triggerBody()?['claimedOid']"
            },
            triggerMetadata: {
              workflowRunId: "@workflow()?['run']?['name']",
              triggerName: 'manual',
              operation: "@triggerBody()?['operation']"
            }
          },
          runtimeConfiguration: { secureData: { properties: ['inputs', 'outputs'] } }
        },
        Responder_sin_token_ni_headers_completos: {
          type: 'Response',
          kind: 'Http',
          runAfter: { Propiedades_de_identidad_observadas: ['Succeeded'] },
          inputs: {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
              ok: true,
              experiment: 'SWC-OAUTH-IDENTITY-TEST',
              warning: 'Los ecos enviados por el cliente son NO CONFIABLES. Un candidato de plataforma solo será confiable si la prueba demuestra que no puede suplantarse.',
              observations: "@outputs('Propiedades_de_identidad_observadas')"
            }
          },
          runtimeConfiguration: { secureData: { properties: ['inputs', 'outputs'] } }
        }
      },
      outputs: {}
    },
    connectionReferences: {},
    flowFailureAlertSubscribed: false,
    isManaged: false
  }
};

const manifest = {
  schema: '1.0',
  details: {
    displayName: name,
    description: 'Flujo aislado sin conectores. Importar deshabilitado y restringir manualmente a un único usuario TEST antes de activarlo.',
    createdTime: new Date().toISOString(),
    packageTelemetryId: crypto.randomUUID(),
    creator: 'N/D',
    sourceEnvironment: ''
  },
  resources: {
    [assetId]: {
      type: 'Microsoft.Flow/flows',
      suggestedCreationType: 'New',
      creationType: 'New',
      details: { displayName: name },
      configurableBy: 'User',
      hierarchy: 'Root',
      dependsOn: []
    }
  }
};

fs.writeFileSync(path.join(packageDir, 'manifest.json'), JSON.stringify(manifest));
fs.mkdirSync(path.join(packageDir, 'Microsoft.Flow', 'flows'), { recursive: true });
fs.writeFileSync(path.join(packageDir, 'Microsoft.Flow', 'flows', 'manifest.json'), JSON.stringify({ packageSchemaVersion: '1.0', flowAssets: { assetPaths: [assetId] } }));
fs.writeFileSync(path.join(flowDir, 'definition.json'), JSON.stringify(definition, null, 2));
fs.writeFileSync(path.join(flowDir, 'apisMap.json'), '{}');
fs.writeFileSync(path.join(flowDir, 'connectionsMap.json'), '{}');

const zip = path.join(output, `${name}.zip`);
execFileSync('tar', ['-a', '-c', '-f', zip, '.'], { cwd: packageDir });
console.log(zip);
