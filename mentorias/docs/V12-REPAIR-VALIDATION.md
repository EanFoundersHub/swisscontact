# Validación de reparación definitiva V1.2

Fecha: 2026-11-05. Destino único: `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST`.

## Importabilidad de flujos

| Comprobación | Mentorías | Administración |
|---|---:|---:|
| Acciones internas | 141 | 47 |
| Disparadores | 1 | 1 |
| Total de nodos | 142 | 48 |
| Nombres globalmente únicos | 141/141 | 47/47 |
| Referencias de expresión no resueltas | 0 | 0 |
| `runAfter` fuera del ámbito hermano | 0 | 0 |
| `HttpRequest` | 20 | 0 |
| `HttpRequest` con parámetros anidados incorrectos | 0 | 0 |
| Marcadores `TENANT` | 0 | 0 |

Las solicitudes HTTP usan el contrato del conector SharePoint: `dataset`, `parameters/method`, `parameters/uri`, `parameters/headers` y, cuando aplica, `parameters/body`. Método, URI, cabeceras, cuerpo y dependencias se conservaron durante la transformación.

## Autenticación y autorización

El navegador aporta una credencial bearer aleatoria. El flujo no acepta `MentorID` ni correo como identidad: busca exactamente una credencial activa, dentro de vigencia y no revocada; deriva `MentorID` de esa fila; comprueba el mentor activo; consulta asignaciones activas y autoriza la empresa antes del despacho. Las consultas de bitácoras y documentos incluyen conjuntamente `EmpresaID` y su identificador. Las respuestas contemplan 401 para credencial inválida/vencida/revocada, 403 para empresa no asignada y 409 para ETag/revisión desactualizada.

Limitación real: la credencial es bearer y puede reutilizarse si se exfiltra. Caducidad, revocación, formato estricto, rate limit, Secure Inputs/Outputs y no persistencia permanente reducen el riesgo, pero no convierten el token en identidad institucional ni en prueba criptográfica de posesión. Los enlaces deben distribuirse por canal individual y renovarse ante sospecha de exposición.

## Aprovisionamiento

El script usa exclusivamente `schema-v12.json`, que enumera diez listas y `SWC12_Documentos`. No contiene recursos `SWC_` anteriores. Comprueba identidades canónicas completas, determina Control total mediante BasePermissions, rompe herencia con `BreakRoleInheritance(false,false)`, registra creaciones por `ExecutionId`, inventaría después de `Apply` incluso ante fallo y limita la recuperación a entradas `Created` de la ejecución indicada.

## Pruebas

`npm test` ejecuta 68 pruebas. Las comprobaciones relevantes inspeccionan el JSON generado, no solamente texto documental:

- unicidad global y conteo 142/48;
- resolución por ámbito de expresiones y `runAfter`;
- estructura real de las 20 solicitudes HTTP;
- URLs TEST y ausencia de `TENANT`;
- Secure Inputs/Outputs en acciones SharePoint;
- derivación de mentor, asignación empresarial y filtros de pertenencia;
- idempotencia, ETag, 401, 403 y 409;
- DocumentoID estable, archivo físico por versión e historial;
- contratos frontend/API, rutas y separación mentor/administrador.

Estas son pruebas locales estructurales y de contrato. La importación y la matriz E2E continúan a cargo de Work con FOUNDERS HUB; no se afirma que hayan sido ejecutadas.

## SHA-256

| Artefacto | SHA-256 |
|---|---|
| SWC-MENTORIAS-V12-TEST.zip | `32B313E334DBFD321A3815E48D211C35B576F8292BECB75E54DEAF23EC9F1177` |
| SWC-ADMIN-V12-TEST.zip | `BB15723640C376E7BB02193A4F030B5C9B71BF1B15E1D26ECE15432C7F97DDDF` |
| SWC-V12-PREVIEW-TEST.zip | `554CE273A98F6322A2C308167218E6CDF4EDBF2D1AE7373F96DACB79FDBF5F73` |
| SWC-V12-PROVISION-TEST.zip | `EEB521AB1D4E2CE1E76E15A8B37A108F0D8D96BF8DDE548A0B95B7FAC96A554E` |
