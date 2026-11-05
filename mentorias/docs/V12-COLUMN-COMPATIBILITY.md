# Matriz de compatibilidad de columnas V1.2

El script contiene el contrato ejecutable completo. Para cada columna compara `TypeAsString`, `Required`, `Indexed`, `EnforceUniqueValues` y, si aplica, todas las opciones Choice. Una columna existente incompatible nunca se corrige automáticamente.

| Lista/biblioteca | Columnas contractuales |
|---|---|
| SWC12_Empresas | EmpresaId Text requerido/único/indexado; NIT, NITNormalizado y RazonSocial Text requeridos; NombreComercial, Sector, Ciudad, DiagnosticoPath y Avance Text; Activa Boolean |
| SWC12_Mentores | MentorId Text requerido/único/indexado; Nombre Text requerido; Email Text; Rol Choice requerido {Mentor, Administrador}; Activo Boolean |
| SWC12_Credenciales | CredentialId Text requerido/único/indexado; MentorId Text requerido; TokenValue Text requerido/único/indexado y fuera de vistas; ValidaDesde y ExpiraEn DateTime requeridos; Activa Boolean; RevocadaEn DateTime; Version Number requerido |
| SWC12_Asignaciones | AsignacionId Text requerido/único/indexado; MentorId y EmpresaId Text requeridos; Activa Boolean |
| SWC12_Rubricas | RubricaId Text requerido/único/indexado; EmpresaId Text, Version Number y ContenidoJson Note requeridos; EstadoRevision Choice requerido {Vigente, Historica}; FechaEvaluacion DateTime |
| SWC12_Bitacoras | BitacoraId Text requerido/único/indexado; EmpresaId Text, RevisionActual Number y VersionVigenteId Number requeridos; Estado Choice requerido {Activa, Anulada} |
| SWC12_BitacoraVersiones | BitacoraId, EmpresaId, Actividad, MentorId, IdempotencyKey y ContenidoHash Text requeridos; Acompanamiento, Avances y Compromisos Note requeridos; Observaciones Note; Revision y DuracionMinutos Number requeridos; FechaSesion DateTime requerida; EstadoRevision Choice requerido {Candidata, Vigente, Historica, Conflicto} |
| SWC12_Operaciones | IdempotencyKey Text requerido/único/indexado; MentorId, EmpresaId y ContenidoHash Text requeridos; ResultadoJson Note; ExpiraEn DateTime requerido; Estado Choice requerido {Pendiente, Confirmada, Fallida} |
| SWC12_Accesos | RequestId Text requerido/único/indexado; MentorId y EmpresaId Text; Operacion Text y Fecha DateTime requeridos; Resultado Choice requerido {Autorizado, Denegado, Limitado, Error} |
| SWC12_Documentos | EmpresaId, BitacoraId, DocumentoId, ContenidoHash, MentorId y NombreArchivo Text; IdempotencyKey Text único/indexado; VersionDocumento Number; Tipo Choice requerido {PlanAccion, Transcripcion, Documento, Etapa0}; UrlDescarga URL requerida |

El estado real `NUEVO`, `COMPATIBLE` o `CONFLICTO` se obtiene únicamente al ejecutar PREVIEW live.
