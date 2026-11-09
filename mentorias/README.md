# Swisscontact Mentorías V1.2 — instalación TEST

La implementación activa del frontend corresponde a V1.2. Los paquetes V1.1 permanecen como respaldo sin modificaciones. Los paquetes nuevos están en `dist/power-automate-v12/`; su guía específica es `docs/V12-IMPORT-ROLLBACK.md` y el alcance de seguridad está en `docs/V12-VALIDATION.md`.

Comprobación local V1.2:

```powershell
npm run build:flows:v12
npm run validate:flows:v12
npm test
```

El frontend consulta empresas asignadas, busca por NIT o razón social, abre las cinco secciones del expediente y utiliza tokens opacos de TEST en `sessionStorage`. No se almacenan tokens ni URLs firmadas en el repositorio. La URL del trigger sigue siendo visible para el navegador por la naturaleza de GitHub Pages; consulte el informe antes de habilitar un flujo.

El módulo está preparado para publicarse de forma independiente en `https://eanfoundershub.github.io/swisscontact/mentorias/`. El Dashboard MEL permanece en la raíz del repositorio. Para comandos locales, sitúese primero en el directorio `mentorias`.

La solución está aislada de `diagnosticoPAF`. No migra, edita ni sobrescribe los JSON de radiografía.

## 1. Crear y aprovisionar el sitio

Requiere una cuenta con rol **SharePoint Administrator** para crear el sitio y una cuenta propietaria para aprovisionarlo.

```powershell
pwsh ./sharepoint/create-test-site.ps1 -TenantAdminUrl https://TENANT-admin.sharepoint.com -OwnerEmail propietario@tenant.com
# revisar la salida; después:
pwsh ./sharepoint/create-test-site.ps1 -TenantAdminUrl https://TENANT-admin.sharepoint.com -OwnerEmail propietario@tenant.com -Apply
pwsh ./sharepoint/provision.ps1 -SiteUrl https://TENANT.sharepoint.com/sites/SWC-Mentorias-TEST -Environment TEST -Apply
```

El aprovisionamiento crea las seis entidades solicitadas, `SWC_Operaciones`, campos Choice con opciones válidas, versión documental y restricciones únicas. `Observaciones` y la asociación de documento a bitácora son opcionales.

## 2. Importar los flujos

1. Power Automate → **Mis flujos** → **Importar** → **Importar paquete (heredado)**.
2. Importar primero `dist/power-automate/SWC-MENTORIAS-API.zip` y después `SWC-ADMIN-API.zip`.
3. En cada paquete seleccionar **Crear como nuevo** y la misma conexión SharePoint de TEST. Esa cuenta necesita editar las listas y biblioteca del sitio TEST, pero no acceso al sitio del diagnóstico productivo.
4. Abrir cada flujo, establecer `SiteUrl` al sitio de mentorías TEST, `DiagnosticoSiteUrl` al sitio que contiene la copia de diagnóstico autorizada y definir `ProxySharedSecret` con un valor aleatorio distinto del valor de ejemplo. En cada empresa, `DiagnosticoPath` debe ser la ruta del JSON dentro de ese sitio. La conexión usada por el flujo requiere solo lectura en el sitio de diagnóstico y edición en el sitio de mentorías TEST.
5. Conservar las URL generadas por los disparadores exclusivamente como configuración secreta del proxy. No entregarlas al navegador ni copiarlas al repositorio.

Las operaciones están implementadas en los paquetes: autorización por identidad, empresa asignada, consultas, alta append-only, revisión con ETag, idempotencia, verificación posterior, documentos y transcripciones versionados, historial y datasets administrativos. No hay respuestas `501`.

## 3. Datos mínimos de autorización

- Crear en `SWC_Mentores` un usuario de prueba con `Email`, `Nombre`, `Rol=Administrador`, `Activo=true`.
- Crear un mentor de prueba y una fila `SWC_Asignaciones` con `MentorEmail`, `EmpresaId`, `MentorNombre` y `Activa=true`.
- Crear únicamente empresas ficticias en `SWC_Empresas`. No copiar todavía las 28 empresas reales.

## 4. Conectar el frontend

Servir la carpeta del proyecto de forma que `web/` y `src/` compartan el mismo origen. Al abrir la aplicación aparece **Conectar APIs**; pegar las dos URL públicas del proxy de TEST.

Los flujos no confían en encabezados de identidad enviados directamente por el navegador. Exigen un proxy HTTPS protegido con Entra ID que:

1. Valide el token y tenant del usuario.
2. Obtenga el correo desde los claims autenticados, nunca desde el cuerpo o URL.
3. Elimine cualquier `x-swc-authenticated-user` y `x-swc-proxy-secret` recibido del cliente.
4. Agregue `x-swc-authenticated-user: correo-validado` y `x-swc-proxy-secret: valor-seguro` al llamar al flujo.
5. Guarde las URL internas de los flujos y el secreto en Key Vault/configuración protegida.
6. Permita CORS únicamente para el origen HTTPS del frontend.

Una llamada directa sin el secreto interno termina con `401 AUTHENTICATED_PROXY_REQUIRED`. No se debe desactivar este control ni poner el secreto en JavaScript.

## 5. Pruebas obligatorias en TEST

Ejecutar primero `npm test`, `npm run build:flows` y `npm run validate:flows`. Después, con dos usuarios ficticios:

1. Mentor A ve solo su empresa; Mentor B obtiene 403 al indicar esa empresa.
2. Crear una bitácora y volver a consultar: exactamente una sesión y una versión.
3. Repetir el mismo `idempotencyKey`: no se crea otra fila.
4. Crear una revisión: la versión anterior permanece y el consolidado suma solo la última duración.
5. Lanzar dos revisiones con el mismo `revisionBase`: una debe persistir y la otra responder conflicto por ETag.
6. Adjuntar transcripción, descargarla y comparar SHA-256; cargar plan v1 y v2 y comprobar que ambos archivos existen.
7. El administrador abre el expediente y ve todas las revisiones y documentos.
8. Confirmar en auditoría que el sitio y flujo productivo de diagnóstico tuvieron cero escrituras.

No se consideran pruebas E2E aprobadas hasta registrar IDs de ejecución, respuestas HTTP y elementos creados en SharePoint TEST.

## Pendiente externo exacto

En esta máquina está instalado PnP.PowerShell 3.1.0, pero no existe una sesión Microsoft 365 autenticada, Power Platform CLI, URL de disparador importada ni proxy Entra ID configurado. Para terminar el despliegue se necesita: cuenta SharePoint Admin, conexión SharePoint de TEST, usuario mentor y administrador ficticios, registro/proxy Entra ID, Key Vault/configuración equivalente y el origen HTTPS del frontend.
