# Auditoría OAuth/CORS V1.1 — 4 de noviembre de 2026

## Resultado

La autenticación del disparador HTTP con bearer de Entra ID está documentada por Microsoft. El disparador valida audiencia, emisor, tenant y, cuando se restringe a usuarios, `oid`. Para nube pública la audiencia documentada es `https://service.flow.microsoft.com/`.

La documentación oficial consultada **no demuestra** que el flujo reciba el `oid` validado como un objeto de identidad confiable y separado de los encabezados/cuerpo controlables por el cliente. Tampoco documenta un encabezado interno equivalente a App Service Easy Auth. Por tanto, la autorización dinámica por OID dentro del flujo queda detenida.

No es aceptable usar `x-swc-authenticated-user`, correo, OID o cualquier identificador enviado por JavaScript. Tampoco se debe decodificar un JWT sin demostrar que es exactamente el token que el disparador validó y que no puede ser reemplazado antes de la expresión.

## Configuración comprobable del disparador

- `Any user in my tenant`: valida usuarios del tenant.
- `Specific users in my tenant`: permite correos u OID concretos.
- También acepta object IDs de service principals en la lista específica.
- Si `Specific users` queda vacío, el alcance vuelve a ser cualquier usuario del tenant.
- `Anyone` es la modalidad heredada abierta y no debe utilizarse.

## CORS

No existe todavía URL de un flujo aislado, tenant ID, client ID, redirect URI registrado ni usuario TEST. Por ello no se ejecutó una solicitud real `OPTIONS`/`POST` y el resultado es **NO VERIFICADO**. `oauth-test/cors-probe.mjs` está preparado para hacerlo sin registrar tokens.

## Alternativa mínima si el OID no se expone de forma confiable

1. Usar el disparador `Specific users in my tenant` con un único mentor por flujo/endpoint y fijar su `MentorOid` como configuración inmutable del flujo. El trigger autentica al único usuario permitido; el navegador no selecciona identidad. Es seguro pero multiplica los flujos.
2. Preferible a escala: acceso delegado a SharePoint/Microsoft Graph con ACL por carpeta/elemento, de modo que SharePoint aplique la identidad del bearer. Requiere rediseñar permisos y no debe conceder acceso general al sitio.
3. Si ninguna alternativa institucional satisface operación y CORS, entonces sí sería indispensable un componente servidor que valide JWT; no se ha autorizado ni implementado en esta fase.

## Fuentes oficiales

- https://learn.microsoft.com/power-automate/oauth-authentication
- https://learn.microsoft.com/power-automate/guidance/coding-guidelines/use-secure-inputs-outputs-triggers
- https://learn.microsoft.com/entra/identity-platform/scenario-spa-call-api
- https://learn.microsoft.com/entra/msal/javascript/browser/initialization
- https://learn.microsoft.com/sharepoint/manage-permission-scope
- https://learn.microsoft.com/graph/permissions-selected-overview
