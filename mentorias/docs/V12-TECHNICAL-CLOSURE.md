# Cierre técnico Swisscontact Mentorías V1.2

Fecha: 2026-11-05. Rama: `feature/mentorias-v1-1`.

## Resultado local

- El portal `/mentorias/` conserva separadas las vistas de mentor y administrador.
- Los flujos funcionales usan exclusivamente `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST`.
- Todas las acciones SharePoint de los flujos funcionales tienen Secure Inputs y Secure Outputs.
- La identidad operativa se obtiene de la credencial validada; `MentorID`, correo y `EmpresaID` del navegador no sustituyen la autorización.
- La autorización de mentor consulta asignaciones activas antes de despachar cualquier operación empresarial.
- Bitácoras y documentos usan revisiones append-only, idempotencia, cabeceras, ETag y archivos físicos independientes.
- PREVIEW es GET-only. PROVISION exige la frase `APROVISIONAR-SWC12-TEST`, cero conflictos y una única definición de Control total con `RoleTypeKind=5` y BasePermissions High/Low de FullMask.

## Aprovisionamiento

`provision-v12-test.ps1` consume `schema-v12.json`, valida exactamente las dos identidades autorizadas, distingue 404/403/error de plataforma, inventaría los 11 recursos, registra cada creación en JSONL y repite el inventario en `finally`. `BreakRoleInheritance(false,false)` evita copiar Propietarios, Integrantes o Visitantes. La recuperación solo acepta entradas `Created` del `ExecutionId` solicitado.

El script PnP requiere un Client ID previamente autorizado; no intenta registrarlo ni solicitar consentimiento. En la restricción institucional actual, la ruta instalable es el paquete `SWC-V12-PROVISION-TEST.zip` usando la conexión FOUNDERS HUB. El aislamiento solo queda probado cuando el inventario posterior muestra `HasUniqueRoleAssignments=true` y únicamente Founders Hub y Felipe con FullMask.

## Validación local versus E2E

Las pruebas locales validan estructura ZIP/JSON, rutas TEST, seguridad de acciones, dependencias `runAfter`, contratos, códigos 401/403/409, idempotencia, ETag y semántica append-only con datos ficticios. No equivalen a una ejecución E2E de Power Automate. La validación E2E permanece pendiente de importación, creación de recursos y ejecución con la conexión institucional.

## SHA-256 definitivos

| Paquete | SHA-256 |
|---|---|
| SWC-MENTORIAS-V12-TEST.zip | `32B313E334DBFD321A3815E48D211C35B576F8292BECB75E54DEAF23EC9F1177` |
| SWC-ADMIN-V12-TEST.zip | `BB15723640C376E7BB02193A4F030B5C9B71BF1B15E1D26ECE15432C7F97DDDF` |
| SWC-V12-PREVIEW-TEST.zip | `554CE273A98F6322A2C308167218E6CDF4EDBF2D1AE7373F96DACB79FDBF5F73` |
| SWC-V12-PROVISION-TEST.zip | `EEB521AB1D4E2CE1E76E15A8B37A108F0D8D96BF8DDE548A0B95B7FAC96A554E` |

