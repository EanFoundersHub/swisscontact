# Prueba aislada OAuth/CORS

Esta sonda no debe apuntar a `SWC-MENTORIAS-API`, `SWC-ADMIN-API` ni al diagnóstico. Requiere un flujo nuevo y desechable en TEST que no tenga conectores SharePoint ni acciones de escritura.

## Flujo mínimo

1. Disparador **When an HTTP request is received**.
2. `Who can trigger the flow`: `Specific users in my tenant` y añadir exclusivamente al probador.
3. Esquema con una propiedad de texto `operation`.
4. Una respuesta `200` con un valor fijo; no devolver el bearer ni los encabezados recibidos.
5. Activar Secure Inputs/Outputs en el disparador y la respuesta.

## Ejecución

Copiar `probe.example.json` como `probe.local.json`; este archivo está ignorado por Git. Obtener con MSAL un token cuyo `aud` sea exactamente el público de Power Automate de la nube institucional. Mantenerlo únicamente en una variable del proceso:

```powershell
$env:SWC_TEST_BEARER_TOKEN = Read-Host -MaskInput 'Token efímero'
node ./oauth-test/cors-probe.mjs ./oauth-test/probe.local.json
Remove-Item Env:SWC_TEST_BEARER_TOKEN
```

La sonda ejecuta `OPTIONS` y `POST`, pero solo imprime estado y encabezados CORS permitidos. Nunca imprime request headers, URL completa ni token.

## Criterio

- `OPTIONS` debe aceptar el origin exacto de GitHub Pages, `POST` y `authorization,content-type`.
- `POST` debe ser 200 con bearer válido.
- Sin bearer debe responder 401/403.
- Un usuario no incluido en `Specific users` debe ser rechazado.

Hasta ejecutar esta prueba con URL, tenant, aplicación SPA y usuario TEST reales, el resultado CORS/OAuth es **NO VERIFICADO**.
