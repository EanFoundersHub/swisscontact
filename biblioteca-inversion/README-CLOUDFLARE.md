# Acceso privado por NIT con Cloudflare Workers

La biblioteca debe desplegarse como un **Cloudflare Worker con Static Assets**. GitHub Pages no puede ser el origen de producción porque su URL pública permitiría saltarse el inicio de sesión.

URL protegida de producción: <https://swisscontact-biblioteca-inversion.afcaballero.workers.dev>

## Preparar los secretos

Desde `biblioteca-inversion`:

```powershell
python .\tools\build-cloudflare-secrets.py "C:\ruta\Dataset_Financiero_Swisscontact_28_Empresas.xlsx"
```

El comando crea `secrets/cloudflare-production.json`, ignorado por Git. El archivo contiene hashes HMAC, no los NIT en texto claro.

## Desplegar

```powershell
npx wrangler login
npx wrangler deploy --secrets-file .\secrets\cloudflare-production.json
```

Después de verificar la URL de Cloudflare, se debe retirar la copia pública de `biblioteca-inversion` en GitHub Pages o dejar de publicar esa ruta. Mientras esa copia exista, el contenido seguirá siendo accesible por la URL histórica.

## Controles incluidos

- Todos los archivos pasan primero por el Worker (`run_worker_first`).
- Comparación de NIT mediante HMAC-SHA-256 y secreto del servidor.
- Cookie de sesión firmada, `HttpOnly`, `Secure`, `SameSite=Strict`, con duración de 8 horas.
- Límite aproximado de 10 intentos por IP por minuto.
- Respuestas privadas sin caché y encabezados contra framing/sniffing.
- NIT y secretos excluidos del repositorio y de los activos públicos.

> El NIT es un identificador que puede ser público. Para seguridad fuerte conviene añadir un PIN individual o un código de un solo uso por empresa.
