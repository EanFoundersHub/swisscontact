# Matriz E2E — SWC-Mentorias-TEST

Estas pruebas son pendientes hasta importar los flujos. Conservar run ID, HTTP status y evidencia redactada; nunca tokens.

| ID | Actor | Operación | Resultado esperado |
|---|---|---|---|
| E01 | Mentor A | `consultarEmpresasDisponibles` | Solo E-TEST-01 y E-TEST-02 |
| E02 | Mentor A | `consultarExpediente` E-TEST-01 | 200; diagnóstico, rúbrica, bitácoras y documentos normalizados |
| E03 | Mentor A | consultar E-TEST-03 | 403 `EMPRESA_NO_ASIGNADA`; sin datos |
| E04 | Token vencido | cualquier consulta | 401 `CREDENCIAL_INVALIDA` |
| E05 | Token revocado | cualquier consulta | 401 `CREDENCIAL_INVALIDA` |
| E06 | Mentor A | crear bitácora de 60 minutos | 200; revisión 1 y una sesión |
| E07 | Mentor A | repetir E06 con misma IdempotencyKey | mismo resultado; sin segunda fila ni horas |
| E08 | Mentor A | corregir E06 a 90 minutos con ETag vigente | revisión 2; historial 1/2; consolidado 1,5 horas |
| E09 | Mentor A | corregir con revisión/ETag obsoleto | 409 `REVISION_DESACTUALIZADA` |
| E10 | Mentor A | cargar PDF permitido | archivo físico v1, DocumentoID estable, cabecera vigente |
| E11 | Mentor A | nueva versión del mismo documento | archivo físico distinto v2; v1 histórica; mismo DocumentoID |
| E12 | Mentor A | repetir E11 con misma IdempotencyKey | recupera respuesta original; no crea v3 |
| E13 | Mentor A | descargar documento vigente E-TEST-01 | contenido v2 y nombre correcto |
| E14 | Mentor A | descargar DocumentoID de E-TEST-03 | rechazo 403/404 sin contenido |
| E15 | Mentor A | cargar tipo/tamaño prohibido | 400 `ARCHIVO_INVALIDO`; sin archivo publicable |
| E16 | Administrador | `consultarConsolidado` | tres empresas; sesiones y horas sin duplicar revisiones |
| E17 | Administrador | `consultarHistorial` por empresa | historial completo y versión vigente identificada |
| E18 | Portal | búsqueda NIT/razón social | coincidencias normalizadas y solo empresas autorizadas |

Una prueba solo pasa si la ejecución real cumple el resultado. Las 64 pruebas locales no sustituyen esta matriz.
