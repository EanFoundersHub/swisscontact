# MANIFEST — Swisscontact Mentorías V1.2 reparada

- Rama: `feature/mentorias-v1-1`
- Commit: `a69beffbbf7adec86a0c37ee332e8dc4fd2d316a`
- Fecha de generación: 2026-11-05
- Destino autorizado: `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST`
- Estado local: 68/68 pruebas; validadores de flujos funcionales y aprovisionamiento aprobados.
- Estado externo: importación y E2E pendientes de Work. Ningún flujo fue importado, ejecutado o habilitado durante la reparación.

## Paquetes Power Automate

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `power-automate/SWC-MENTORIAS-V12-TEST.zip` | 11119 | `32B313E334DBFD321A3815E48D211C35B576F8292BECB75E54DEAF23EC9F1177` |
| `power-automate/SWC-ADMIN-V12-TEST.zip` | 6598 | `BB15723640C376E7BB02193A4F030B5C9B71BF1B15E1D26ECE15432C7F97DDDF` |
| `power-automate/SWC-V12-PREVIEW-TEST.zip` | 7621 | `554CE273A98F6322A2C308167218E6CDF4EDBF2D1AE7373F96DACB79FDBF5F73` |
| `power-automate/SWC-V12-PROVISION-TEST.zip` | 8750 | `EEB521AB1D4E2CE1E76E15A8B37A108F0D8D96BF8DDE548A0B95B7FAC96A554E` |

## SharePoint

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `sharepoint/provision-v12-test.ps1` | 14274 | `B7238AA96C633DADAAD25DA4CC50F6B3445865A0986E485013F15A7F7BC1B431` |
| `sharepoint/schema-v12.json` | 10490 | `B00FF4C881A25154408D0D661118BDCDE67B0982D34B417FE94363BAE71F0899` |

## Frontend `/mentorias/`

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `frontend/index.html` | 3110 | `FFE882D06D688F9B6F7151A4B69142DDD8F9536E9EF111C98E78089704A24C91` |
| `frontend/styles.css` | 3660 | `9283CD98C54EFC2617228E0D24BB10A0928F0E5C6726E497490AC92CB22F78F2` |
| `frontend/app.js` | 15617 | `ADEDE346CFC412C4430A6C40B5A51DAFB0868BAC36C181B139D02A1318F72519` |
| `frontend/src/core.js` | 5170 | `83C5291F0155CEDD452423CE1C7A77009134F0661875AA36E3DB2FCCFF9BCB86` |
| `frontend/config.js` | 624 | `F5E6DD9D815AD173F9FF0E2B237CCBF61240459994D23CB653C5ADC1892D5706` |
| `frontend/config.example.js` | 137 | `5CBCD936ABBDFC22B2469F466B594A738924C5CC8C685C8EE0D5C3F897104E0A` |
| `frontend/auth-msal.js` | 1827 | `B3C8C3823A34799529EB926769170335F0BCA8754A85069652BA390D1E555E94` |
| `frontend/msal.config.example.js` | 789 | `6166018643C2A6F91FBEE6992CC72F36C8FB37D959E83B876D8270C22E64F901` |

## Documentación

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `docs/V12-DEPLOYMENT-WORK.md` | 2434 | `8BDD329F3FF899C239E1D7EABB4452EC03885389500FB215104FD1F42B44CBBF` |
| `docs/V12-E2E-MATRIX.md` | 2090 | `A0CBE18BF2E68F0CC3632598FB32602B7578A1843D5FF0A23A5B9E3364B36D3E` |
| `docs/V12-REPAIR-VALIDATION.md` | 3544 | `0CBB2F05EEFD377BF7B6AC2DEDB840CD2B88CE4D6FC8E81D5BB6D45BF3B2C0AE` |
| `docs/V12-TECHNICAL-CLOSURE.md` | 2691 | `3714D6B5FCF6A602091DE03739276A28DCBA60755A32E2A9570568A7620C8E0E` |

## Primera prueba real

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `tests/e2e/run-v12-smoke-test.ps1` | 13181 | `DEFF58E59DF36E0B0A0F77BF9E728448D332A54E21B8D8F8F8B07AFA215BA32B` |
| `docs/V12-LOCAL-SMOKE-TEST.md` | 1850 | `EB110CBBCFE4F617E97F2FBB4D1E4C42BB3DEC2563B961A8C012472BEBBEC185` |

## Criterios validados

- 142 nodos de Mentorías y 48 de Administración, sin nombres duplicados.
- Cero referencias de expresión o `runAfter` sin resolver.
- Veinte `HttpRequest` con parámetros planos del conector SharePoint.
- Cero marcadores `TENANT`; destino exclusivo TEST.
- Secure Inputs/Outputs en acciones SharePoint.
- Autorización por credencial validada, MentorID derivado y asignación activa.
- Idempotencia, ETag, versiones append-only y pertenencia empresarial verificadas estructuralmente.
- Rutas del frontend y separación mentor/administrador verificadas.

