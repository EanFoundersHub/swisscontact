# Informe de validación V1.2

Fecha local: 5 de noviembre de 2026. Rama: `feature/mentorias-v1-1`.

## Credenciales

La V1.2 no usa correo, `MentorID`, `EmpresaID` ni un hash calculado por JavaScript como identidad. `manage-v12-test-credential.ps1` genera 32 bytes con `RandomNumberGenerator`, codifica 43 caracteres base64url, escribe la credencial solamente en `SWC12_Credenciales` y copia el valor al portapapeles sin imprimirlo. Renovar revoca la versión anterior; revocar no elimina historial.

Power Automate valida longitud y caracteres peligrosos antes de consultar SharePoint, vigencia, estado, revocación y rol. Después resuelve `MentorID`, aplica 30 solicitudes por 15 minutos y valida asignación. El trigger y la consulta de credenciales usan Secure Inputs/Outputs. Las respuestas y `SWC12_Accesos` no contienen el token.

El token se almacena en texto en una lista restringida porque no se encontró una función criptográfica SHA-256/HMAC documentada y comprobada dentro de Power Automate. Un hash calculado por el navegador sería una credencial reutilizable y no fue implementado. Antes de cargar credenciales, debe romperse la herencia de permisos de `SWC12_Credenciales` y conceder acceso solo al propietario/conexión del flujo y administradores designados.

## Controles implementados

- Empresa autorizada antes del `Switch` funcional.
- Bitácora filtrada simultáneamente por `BitacoraID` y `EmpresaID`.
- Documento asociado a bitácora solo si esta pertenece a la empresa.
- Append-only en `SWC12_BitacoraVersiones`.
- Puntero vigente en cabecera y actualización ETag.
- Idempotencia persistida en `SWC12_Operaciones`.
- Archivo físico, metadatos y versionado en `SWC12_Documentos`.
- Diagnóstico leído desde una ubicación TEST de solo lectura.
- Consulta administrativa consolidada en una sola ejecución.

## Resultado local

`npm run build:flows:v12`, `npm run validate:flows:v12` y `npm test` deben ejecutarse antes de importar. Estas pruebas validan contratos y estructura; no son una prueba E2E. La importación, conexión SharePoint, CORS y operaciones reales permanecen pendientes de credenciales institucionales y ejecución en TEST.

## Limitación residual

GitHub Pages no puede ocultar la URL firmada del trigger. La credencial protege datos, pero un tercero que obtenga el endpoint puede consumir ejecuciones antes del rechazo. El límite implementado opera después de identificar una credencial válida; un límite perimetral requeriría un intermediario servidor.
