# Correcciones de bloqueos preinstalación V1.2

- Seguridad: permisos restringidos y reversibles en las tres listas sensibles; TokenValue excluido de vistas.
- Documentos: creación física, ItemId, metadatos, consulta, descarga autorizada y modelo append-only único.
- Concurrencia: ETag real de SharePoint y `IF-MATCH`.
- Idempotencia: resultado original, estados explícitos y recuperación/liberación de reservas.
- Consolidado: MentorNombre se relaciona por MentorID desde SWC12_Mentores.
- CORS: sonda real de navegador preparada para OPTIONS/POST, Authorization opcional y JSON.

## Pendientes externos

Se requieren cuenta de conexión Founders Hub, administradores, URL TEST, conexión SharePoint en Power Automate y endpoint temporal. Si el trigger no admite el preflight del dominio definitivo, la alternativa mínima es un proxy institucional existente que controle CORS y mantenga el endpoint fuera del navegador; no se añade Azure Functions automáticamente.

No se realizaron escrituras, importaciones, habilitaciones, publicaciones ni cambios de producción.
