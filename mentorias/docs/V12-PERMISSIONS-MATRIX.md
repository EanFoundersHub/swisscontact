# Matriz de permisos V1.2

| Recurso | Herencia deseada | Principales permitidos | Nivel | Verificación |
|---|---|---|---|---|
| SWC12_Credenciales | Rota | `ServiceAccountEmail` y cada `AdminEmails` explícito | Full Control | Rol existente, asignaciones efectivas y vistas |
| SWC12_Operaciones | Rota | `ServiceAccountEmail` y cada `AdminEmails` explícito | Full Control | Rol existente y asignaciones efectivas |
| SWC12_Accesos | Rota | `ServiceAccountEmail` y cada `AdminEmails` explícito | Full Control | Rol existente y asignaciones efectivas |
| Resto de listas V1.2 | Heredada | Política del sitio TEST | Heredado | Inventario PREVIEW |
| SWC12_Documentos | Heredada | La conexión de los flujos; el mentor accede solo mediante flujo | Heredado | Autorización de empresa en el flujo |

`Full Control` es un nivel predeterminado de SharePoint, pero el script además exige que el rol exista en el sitio concreto. Los administradores no están codificados: deben entregarse explícitamente en `AdminEmails`.

`ClearSubScopes` no se utiliza porque borraría asignaciones únicas de objetos hijos y los haría heredar. PREVIEW enumera subámbitos únicos; su presencia bloquea Apply para revisión manual.

## TokenValue

- Debe permanecer fuera de todas las vistas de `SWC12_Credenciales`.
- PREVIEW informa cualquier vista que lo exponga; Apply lo retira.
- Los paquetes fueron recorridos nodo por nodo: ninguna acción Response contiene `accessToken` ni `TokenValue`.
- Riesgo residual: TokenValue está en texto y equivale a una credencial reutilizable. La mitigación depende de aislamiento de lista, Secure Inputs/Outputs, caducidad, revocación y protección del endpoint. Un administrador de sitio o propietario de la conexión con Full Control puede leerlo.

La confirmación de permisos efectivos sigue pendiente del PREVIEW live autenticado.
