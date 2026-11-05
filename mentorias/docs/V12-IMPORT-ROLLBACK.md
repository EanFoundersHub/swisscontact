# Importación y reversión V1.2 TEST

## Preparación

1. Confirmar que la URL termina exactamente en `/sites/SWC-Mentorias-TEST`.
2. Ejecutar `pwsh ./sharepoint/provision-v12-test.ps1 -SiteUrl <URL-TEST>` y revisar el dry run.
3. Repetir con `-Apply` usando una cuenta autorizada.
4. Romper la herencia de `SWC12_Credenciales`; permitir únicamente propietario/conexión de los flujos y administradores designados.
5. Cargar solo empresas ficticias o una copia TEST expresamente autorizada. No copiar ni modificar los JSON productivos.

## Importar

1. Importar como nuevos `dist/power-automate-v12/SWC-MENTORIAS-V12-TEST.zip` y `SWC-ADMIN-V12-TEST.zip` mediante **Importar paquete (heredado)**.
2. Seleccionar la conexión SharePoint exclusiva de TEST.
3. Configurar `SiteUrl` con `SWC-Mentorias-TEST` y `DiagnosticoSiteUrl` con una biblioteca TEST de solo lectura.
4. Mantener ambos flujos deshabilitados.
5. Revisar el trigger. La arquitectura directa necesita el modo heredado `Anyone`; esto expone la URL firmada y debe ser una aceptación explícita del riesgo.
6. Configurar CORS para `https://eanfoundershub.github.io` si el trigger/entorno lo admite y ejecutar OPTIONS/POST reales antes de publicar.
7. Crear mentor, asignación y credencial TEST. Ejemplo: `pwsh ./sharepoint/manage-v12-test-credential.ps1 -SiteUrl <URL-TEST> -Action Create -MentorId M-TEST-01 -Apply`.
8. Entregar el token mediante un enlace con fragmento `https://eanfoundershub.github.io/swisscontact/mentorias/#access_token=<TOKEN>`; no enviarlo en query string.

## Prueba E2E pendiente

Registrar códigos HTTP e IDs de ejecución para token válido, inválido, vencido y revocado; acceso cruzado; creación y revisión; ETag; documento físico y descarga; diagnóstico/rúbrica; consolidado. No marcar E2E aprobada sin esas evidencias.

## Reversión

1. Deshabilitar ambos flujos V1.2.
2. Ejecutar el dry run de `rollback-v12-test.ps1` y luego `-Apply` para revocar credenciales conservando datos.
3. Retirar las URLs/tokens de las sesiones del navegador.
4. Conservar listas para auditoría. Solo si se autoriza borrar datos TEST, usar `-DeleteTestData`; el script rechaza cualquier sitio distinto de `SWC-Mentorias-TEST`.
5. Los paquetes V1.1, OAuth TEST, Dashboard MEL y diagnóstico permanecen intactos.
