# Informes de diagnóstico protegidos

Los informes contienen NIT, respuestas y cifras financieras. No deben copiarse al repositorio ni a GitHub Pages.

## Arquitectura

1. El dashboard público conserva únicamente el enlace de cada empresa.
2. Los HTML se guardan como objetos privados en Cloudflare R2.
3. Un Worker los entrega con `Content-Disposition: inline`, para que se abran al hacer clic.
4. Cloudflare Access protege todo el dominio del Worker y permite únicamente las cuentas autorizadas.
5. La URL `workers.dev` permanece desactivada para que no exista una ruta que omita Access.

## Puesta en producción

1. Crear el bucket privado `swisscontact-diagnosticos`.
2. Copiar `wrangler.example.jsonc` a `wrangler.jsonc` y sustituir dominio y zona.
3. Desplegar el Worker y crear una aplicación de Cloudflare Access sobre `diagnosticos.<dominio>/*`.
4. Copiar al `wrangler.jsonc` el dominio del equipo de Access y el AUD de la aplicación. El Worker valida firma, emisor, audiencia y expiración del JWT.
5. Autorizar las cuentas institucionales de Paula, Lorenzo y las demás personas aprobadas. No usar números celulares como contraseña compartida.
6. Subir solo los informes finales. Los borradores pueden cargarse únicamente si se necesita revisión y deben estar identificados como tales.
7. Establecer la URL del Worker en `diagnostics-config.js` y publicar el dashboard.

Ejemplo de carga individual:

```powershell
npx wrangler r2 object put "swisscontact-diagnosticos/agronacer-s-a-s.html" --file "C:\ruta\agronacer-s-a-s.html" --content-type "text/html; charset=utf-8" --remote
```

## Verificación obligatoria

- Sin sesión de Access, la URL debe responder 401 o redirigir al inicio de sesión.
- Con una cuenta autorizada, el informe debe abrirse en el navegador y no descargarse forzosamente.
- La URL `*.workers.dev` no debe existir.
- Los HTML y los `estado.json` nunca deben aparecer en `git status`.
