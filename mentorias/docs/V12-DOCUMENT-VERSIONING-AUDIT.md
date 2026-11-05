# Auditoría de versionado documental V1.2

Se revisaron expresiones, filtros y `runAfter` de las definiciones existentes, sin modificar ni reconstruir los paquetes.

## Cadena de escritura del flujo mentor

1. `Validar_archivo` verifica longitud base64, MIME permitido y longitud del nombre.
2. `Buscar_idempotencia` consulta la biblioteca por IdempotencyKey y `Validar_bitacora` filtra simultáneamente BitacoraId y EmpresaId.
3. Solo si no existe documento previo y la bitácora pertenece a la empresa se ejecuta `Reservar_operacion`.
4. `Documento_id` genera un GUID; `Crear_archivo` ejecuta CreateFile con un nombre que incluye EmpresaId, tipo e IdempotencyKey. No existe acción de sobrescritura ni ruta reutilizada para claves distintas.
5. `ItemId_archivo` depende de CreateFile. `Actualizar_metadatos` depende del ItemId y usa PatchFileItem para EmpresaId, BitacoraId, DocumentoId, VersionDocumento, IdempotencyKey, hash, MentorId, tipo y nombre.
6. La confirmación idempotente depende de PatchFileItem; la respuesta depende de la confirmación.

Esto demuestra que cargas con claves idempotentes distintas crean archivos independientes y conservan los anteriores. `GetFileItems` filtra por EmpresaId y devuelve todos los archivos, por lo que la consulta ofrece el historial completo de cargas de la empresa.

## Descarga

En ambos flujos, `Buscar_documento` filtra conjuntamente `EmpresaId` y `DocumentoId`. `Leer_archivo`/GetFileContent solo se ejecuta en la rama donde el resultado contiene exactamente un elemento. Un documento ajeno produce el mismo 404 genérico que uno inexistente.

## Incompatibilidad detectada

`cargarNuevaVersionDocumento` reutiliza la misma cadena de carga, pero genera un DocumentoId nuevo y asigna `VersionDocumento = ItemId` de SharePoint. No conserva el DocumentoId original ni calcula una revisión correlativa por documento. Por ello:

- Sí hay archivos append-only e historial completo por empresa.
- No hay sobrescritura del archivo anterior.
- No puede demostrarse una cadena de versiones del mismo documento bajo un DocumentoId estable.
- VersionDocumento es un identificador monotónico de elemento, no un número de versión por documento.

Esta incompatibilidad requiere una futura revisión de los paquetes; por instrucción, los ZIP originales permanecieron byte por byte intactos.
