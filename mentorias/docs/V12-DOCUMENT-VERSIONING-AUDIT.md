# Auditoría de versionado documental V1.2

Fecha: 5 de noviembre de 2026. Corrección basada en `a69357e`.

## Modelo definitivo

`SWC12_DocumentosCabecera` mantiene una fila por documento lógico: DocumentoId único, EmpresaId, VersionActual, ItemVigenteId y Estado. `SWC12_Documentos` conserva un archivo físico por revisión. El versionado nativo permanece deshabilitado; no se sobrescriben binarios.

## Nueva carga

1. La autorización general del flujo resuelve el MentorID desde la credencial y valida la asignación activa de EmpresaID antes del switch.
2. Se consulta `SWC12_Operaciones`. Una clave confirmada devuelve ResultadoJson; una clave pendiente o fallida devuelve conflicto y no vuelve a crear un archivo.
3. Se reserva la operación, se genera DocumentoId una sola vez y VersionDocumento=1.
4. CreateFile crea el archivo independiente. PatchFileItem registra DocumentoId, EmpresaId, versión, referencia anterior, FechaCarga, MentorId, nombre, IdempotencyKey, EsVigente y EstadoVersion.
5. Se crea la cabecera con ItemVigenteId. Solo después se confirma la operación.

## Nueva versión

1. El cliente envía el DocumentoId existente; no puede indicar MentorID.
2. Se busca la cabecera simultáneamente por DocumentoId, EmpresaId y Estado activo.
3. La cabecera se lee por REST para obtener `@odata.etag`, VersionActual e ItemVigenteId.
4. VersionDocumento se calcula como VersionActual+1 y DocumentoId se toma de la cabecera, no del navegador.
5. Se crea otro archivo físico con nombre DocumentoId-versión-idempotencia; inicialmente queda Candidata.
6. La cabecera se actualiza con `IF-MATCH`. Si otra ejecución ganó, el archivo queda Conflicto, la operación queda Fallida y no se convierte en vigente.
7. Tras ganar el ETag, la nueva revisión se marca Vigente y la anterior Histórica. La cabecera es la autoridad para ItemVigenteId.

## Consulta y descarga

El contrato devuelve todas las filas de la biblioteca, incluyendo VersionDocumento, DocumentoAnteriorID, FechaCarga, vigente y EstadoVersion. La descarga busca primero la cabecera y todos los archivos del DocumentoId dentro de la EmpresaID autorizada, filtra por ItemVigenteId y solo entonces ejecuta GetFileContent. Para documentos legados sin cabecera se admite únicamente una revisión vigente implícita.

## Compatibilidad de legados

`migrate-v12-document-headers.ps1` agrupa metadatos existentes y crea exclusivamente filas de cabecera. No ejecuta Set-PnPListItem sobre SWC12_Documentos ni modifica archivos. Un documento legado sin cabecera sigue visible y descargable; para crearle una revisión primero debe migrarse su cabecera.

No se ejecutó la migración ni se realizaron escrituras en SharePoint.
