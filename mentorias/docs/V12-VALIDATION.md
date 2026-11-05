# Informe de validación V1.2

Fecha local: 5 de noviembre de 2026. Rama: `feature/mentorias-v1-1`.

La credencial V1.2 se genera con aleatoriedad criptográfica y no se calcula en el navegador. El aprovisionamiento rompe herencia en `SWC12_Credenciales`, `SWC12_Operaciones` y `SWC12_Accesos`, concede acceso solo a la cuenta de conexión y administradores designados, y retira TokenValue de todas las vistas. Debe verificarse tras `-Apply`.

La autorización resuelve MentorID desde la credencial, valida vigencia/revocación/rol y comprueba la asignación antes del switch funcional. Bitácoras y documentos se filtran simultáneamente por EmpresaID. Las respuestas no contienen el token.

Las revisiones son append-only. La cabecera se lee por REST para obtener `@odata.etag` y se actualiza con `IF-MATCH`; solo después se marca la revisión vigente. La idempotencia persiste Pendiente/Confirmada/Fallida y ResultadoJson; una repetición confirmada devuelve el resultado original y una reserva no recuperable se libera como fallida para reintento explícito.

Los documentos usan un único modelo: archivos append-only, con versionado nativo deshabilitado. La secuencia es CreateFile → ItemId → PatchFileItem; consulta GetFileItems y descarga GetFileContent autorizada. Se validan tamaño, MIME y nombre en backend. No se entrega URL directa de SharePoint.

Las pruebas locales validan estructura y contratos, no E2E. Importación, conexión, CORS y operaciones reales siguen pendientes de ejecución institucional en TEST. GitHub Pages no puede ocultar la URL firmada del trigger ni corregir un preflight rechazado.
