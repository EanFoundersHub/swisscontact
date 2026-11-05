# Guía de despliegue para Work — V1.2 TEST

## Operaciones exactas

1. Verificar los cuatro SHA-256 de `V12-TECHNICAL-CLOSURE.md`.
2. Importar únicamente `SWC-V12-PREVIEW-TEST.zip` como flujo nuevo y seleccionar la conexión SharePoint de `foundershub@universidadean.edu.co`.
3. Mantener el flujo deshabilitado; ejecutarlo manualmente desde Power Automate. No suministra URL dinámica ni credenciales.
4. Guardar sus salidas JSON y Markdown. Detenerse si aparece `CONFLICTO`, un destino distinto de TEST o permisos no verificables.
5. Importar `SWC-V12-PROVISION-TEST.zip` como flujo nuevo, seleccionar la misma conexión y mantenerlo deshabilitado.
6. Revisar que todas las solicitudes apunten a `SWC-Mentorias-TEST`. Ejecutar manualmente con `confirmacion = APROVISIONAR-SWC12-TEST`.
7. Revisar `Inventario_posterior`: deben existir diez listas y una biblioteca, estructura compatible, herencia rota y únicamente Founders Hub y `afcaballero@universidadean.edu.co` con Control total. Si esto no puede probarse, no continuar.
8. Retirar `TokenValue` de cualquier vista si el inventario muestra una exposición. Nunca copiar sus valores a informes.
9. Importar `SWC-MENTORIAS-V12-TEST.zip` y `SWC-ADMIN-V12-TEST.zip` como flujos nuevos; seleccionar FOUNDERS HUB. No sobrescribir flujos V1.1.
10. Confirmar que `SiteUrl` y `DiagnosticoSiteUrl` conservan la URL TEST. Guardar ambos flujos inicialmente deshabilitados.
11. Crear datos ficticios: mentores `M-TEST-A`/`M-TEST-B`, empresas `E-TEST-01`/`02`/`03`, asignando 01/02 a A y 03 a B. Generar tokens aleatorios con `new-v12-test-token.mjs`; no registrar tokens en capturas.
12. Habilitar temporalmente los dos flujos funcionales y ejecutar la matriz `V12-E2E-MATRIX.md` desde el portal local o la sonda autorizada.
13. Registrar URL de disparador y token solo en configuración de sesión del portal TEST. No enviarlos a Git ni publicarlos en el Dashboard MEL.
14. Si todas las pruebas pasan, conservar evidencia de run IDs y respuestas redactadas. Si una falla, deshabilitar los flujos y no publicar GitHub Pages.

## Reversión

- Deshabilitar los cuatro flujos nuevos.
- Eliminar únicamente flujos importados con los nombres V1.2 TEST.
- Para recursos SharePoint, usar exclusivamente el diario de la ejecución y el `ExecutionId`; nunca eliminar recursos `SWC_` ni archivos preexistentes.
- No ejecutar `migrate-v12-document-headers.ps1` durante esta instalación inicial.

