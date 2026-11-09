# Importación y reversión V1.2 TEST

1. Confirmar que la URL termina exactamente en `/sites/SWC-Mentorias-TEST`.
2. Ejecutar el dry-run: `pwsh ./sharepoint/provision-v12-test.ps1 -SiteUrl <URL-TEST> -ServiceAccountEmail <CUENTA-CONEXION> -AdminEmails <ADMIN1>,<ADMIN2>`.
3. Tras revisar la salida, repetir con `-Apply`. Verificar manualmente permisos de Credenciales, Operaciones y Accesos y que TokenValue no aparezca en vistas.
4. Si existen documentos V1.2 anteriores, ejecutar primero el PREVIEW de `migrate-v12-document-headers.ps1`. Resolver conflictos y solo entonces repetir con `-Apply`; esta migración crea cabeceras, pero no modifica archivos.
5. Importar como nuevos los dos ZIP de `dist/power-automate-v12/` mediante **Importar paquete (heredado)**; seleccionar únicamente la conexión SharePoint TEST.
6. Configurar `SiteUrl` con SWC-Mentorias-TEST y `DiagnosticoSiteUrl` con el origen TEST de solo lectura. Mantener los flujos deshabilitados.
7. Confirmar en el diseñador las referencias de `SWC12_Documentos`, `SWC12_DocumentosCabecera` y la conexión. No cargar datos productivos.
8. Crear datos ficticios y credenciales TEST. El token se entrega en el fragmento `#access_token=`, nunca en query string.
9. Publicar temporalmente la sonda `tests/manual/cors-v12-browser-probe.html` bajo `/swisscontact/mentorias/`; ejecutar OPTIONS y POST desde ese origen y registrar estados/encabezados. Retirarla al terminar.
10. Ejecutar E2E de token válido/inválido/vencido/revocado, acceso cruzado, creación/repetición, dos revisiones concurrentes del mismo DocumentoID, historial, descarga vigente, horas y consolidado.

## Reversión

1. Deshabilitar los dos flujos V1.2.
2. Ejecutar el dry-run de `rollback-v12-test.ps1`; usar `-Apply` para revocar credenciales. Añadir `-ResetSecurity` solo para restaurar herencia de las tres listas sensibles.
3. Conservar datos para auditoría. `-DeleteTestData` requiere autorización explícita y el script rechaza cualquier sitio distinto de TEST.
4. V1.1, OAuth TEST, Dashboard MEL y diagnóstico quedan intactos.
