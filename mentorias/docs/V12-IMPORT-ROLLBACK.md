# Importación y reversión V1.2 TEST

1. Confirmar que la URL termina exactamente en `/sites/SWC-Mentorias-TEST`.
2. Ejecutar el dry-run: `pwsh ./sharepoint/provision-v12-test.ps1 -SiteUrl <URL-TEST> -ServiceAccountEmail <CUENTA-CONEXION> -AdminEmails <ADMIN1>,<ADMIN2>`.
3. Tras revisar la salida, repetir con `-Apply`. Verificar manualmente permisos de Credenciales, Operaciones y Accesos y que TokenValue no aparezca en vistas.
4. Importar como nuevos los dos ZIP de `dist/power-automate-v12/` mediante **Importar paquete (heredado)**; seleccionar únicamente la conexión SharePoint TEST.
5. Configurar `SiteUrl` con SWC-Mentorias-TEST y `DiagnosticoSiteUrl` con el origen TEST de solo lectura. Mantener los flujos deshabilitados.
6. Confirmar en el diseñador las referencias de biblioteca y conexión. No cargar datos productivos.
7. Crear datos ficticios y credenciales TEST. El token se entrega en el fragmento `#access_token=`, nunca en query string.
8. Publicar temporalmente la sonda `tests/manual/cors-v12-browser-probe.html` bajo `/swisscontact/mentorias/`; ejecutar OPTIONS y POST desde ese origen y registrar estados/encabezados. Retirarla al terminar.
9. Ejecutar E2E de token válido/inválido/vencido/revocado, acceso cruzado, creación/repetición/revisión concurrente, horas, archivo/descarga y consolidado.

## Reversión

1. Deshabilitar los dos flujos V1.2.
2. Ejecutar el dry-run de `rollback-v12-test.ps1`; usar `-Apply` para revocar credenciales. Añadir `-ResetSecurity` solo para restaurar herencia de las tres listas sensibles.
3. Conservar datos para auditoría. `-DeleteTestData` requiere autorización explícita y el script rechaza cualquier sitio distinto de TEST.
4. V1.1, OAuth TEST, Dashboard MEL y diagnóstico quedan intactos.
