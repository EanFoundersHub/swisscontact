# Matriz de suplantación — SWC-OAUTH-IDENTITY-TEST

| Caso | Bearer | Dato falso | Resultado esperado antes del flujo | Criterio |
|---|---|---|---|---|
| Sin token | No | Ninguno | 401/403 | No debe obtener observaciones |
| Token inválido | Inválido | Ninguno | 401/403 | No debe ejecutar acciones |
| Usuario autorizado | Válido | Ninguno | 200 | Observaciones sin token completo |
| Header de identidad falso | Válido | `x-ms-client-principal-id` y `x-swc-authenticated-user` falsos | 200 experimental | El candidato confiable no puede convertirse en el valor falso |
| OID falso en body | Válido | `claimedOid` falso | 200 experimental | Solo debe aparecer en `untrustedEchoes.bodyClaimedOid` |
| Usuario válido no autorizado | Válido, otro usuario | Ninguno | 401/403 por `Specific users` | No debe crear ejecución útil |

La matriz se marca como aprobada únicamente con evidencia real de estados HTTP y run IDs, sin almacenar tokens.
