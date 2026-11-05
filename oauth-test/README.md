# Prueba aislada OAuth/CORS e identidad

Esta sonda no debe apuntar a `SWC-MENTORIAS-API`, `SWC-ADMIN-API` ni al diagnóstico. El paquete independiente se genera con `npm run build:oauth-test` y se valida con `npm run validate:oauth-test`.

## Flujo mínimo

1. Importar `oauth-test/dist/SWC-OAUTH-IDENTITY-TEST.zip` como flujo nuevo.
2. Mantenerlo deshabilitado durante la revisión.
3. En el disparador, cambiar `Who can trigger the flow` a `Specific users in my tenant` y añadir exclusivamente al probador. El paquete no inventa la propiedad interna de exportación de esta lista.
4. Confirmar que no existen conexiones ni acciones distintas de Compose/Response.
5. Confirmar Secure Inputs/Outputs en disparador, Compose y respuesta.
6. Guardar, obtener la URL y solo entonces activar el flujo TEST.

## Ejecución

Copiar `probe.example.json` como `probe.local.json`; este archivo está ignorado por Git. Obtener con MSAL un token cuyo `aud` sea exactamente el público de Power Automate de la nube institucional. Mantenerlo únicamente en una variable del proceso:

```powershell
$env:SWC_TEST_BEARER_TOKEN = Read-Host -MaskInput 'Token efímero'
node ./oauth-test/cors-probe.mjs ./oauth-test/probe.local.json
Remove-Item Env:SWC_TEST_BEARER_TOKEN
```

La sonda ejecuta `OPTIONS` y `POST`, pero solo imprime estado y encabezados CORS permitidos. Nunca imprime request headers, URL completa ni token.

La prueba de identidad usa otro archivo local:

```powershell
Copy-Item ./oauth-test/identity.example.json ./oauth-test/identity.local.json
# completar endpoint y OID conocido del único usuario TEST
$env:SWC_TEST_BEARER_TOKEN = Read-Host -MaskInput 'Token efímero'
node ./oauth-test/identity-probe.mjs ./oauth-test/identity.local.json
Remove-Item Env:SWC_TEST_BEARER_TOKEN
```

## Criterio

- `OPTIONS` debe aceptar el origin exacto de GitHub Pages, `POST` y `authorization,content-type`.
- `POST` debe ser 200 con bearer válido.
- Sin bearer debe responder 401/403.
- Un usuario no incluido en `Specific users` debe ser rechazado.

Hasta ejecutar esta prueba con URL, tenant, aplicación SPA y usuario TEST reales, el resultado CORS/OAuth es **NO VERIFICADO**.
