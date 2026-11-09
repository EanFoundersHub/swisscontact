# Matriz de operaciones de instalación V1.2

| Flujo | Acción | Método | Destino | Escritura | Condición |
|---|---|---|---|---:|---|
| PREVIEW | Consultar sitio | GET | `_api/web` | No | Siempre |
| PREVIEW | Consultar listas, campos y vistas | GET | `_api/web/lists?...&$expand=Fields,Views` | No | Después del sitio |
| PREVIEW | Consultar permisos Credenciales | GET | `roleassignments` | No | Después del inventario |
| PREVIEW | Consultar permisos Operaciones | GET | `roleassignments` | No | Aunque la consulta anterior sea no verificable |
| PREVIEW | Consultar permisos Accesos | GET | `roleassignments` | No | Aunque la consulta anterior sea no verificable |
| PREVIEW | Comparar contrato | Data Operations | Memoria de ejecución | No | Inventario disponible |
| PREVIEW | Generar JSON/Markdown | Compose | Historial de ejecución | No | Comparación completa |
| PROVISION | Auditoría completa | GET/Data Operations | Sitio TEST | No | Siempre antes de escribir |
| PROVISION | Crear lista/biblioteca | POST | `_api/web/lists` | Sí | Frase exacta, cero conflictos y recurso ausente |
| PROVISION | Crear columna | POST | `fields/createfieldasxml` | Sí | Frase exacta, cero conflictos y columna ausente |

No existen DELETE, PATCH ni MERGE. PROVISION no contiene acciones para permisos, datos, documentos o migración.
