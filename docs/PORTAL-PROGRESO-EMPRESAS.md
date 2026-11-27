# Portal de progreso por empresa

El código está separado en dos piezas del repositorio: la interfaz estática de GitHub Pages en `empresa-progreso/` y la API de Cloudflare Workers en `empresa-progreso-worker/`. Los archivos de Diagnóstico y Plan permanecen en el bucket privado `swisscontact-diagnosticos`; no se suben al repositorio ni a GitHub Pages.

## Acceso

La interfaz no pide ni valida el NIT por su cuenta. El Worker existente de la Biblioteca debe confirmar primero la sesión de la empresa y emitir un grant HMAC de corta duración con estos claims:

- `companyId`: código interno, por ejemplo `IR-001`
- `companyName`: nombre visible
- `aud`: `swc-empresa-progreso`
- `exp`: expiración Unix en segundos, máximo 90 segundos

El grant se envía a `empresa-progreso/index.html#swc_company_grant=<token>`. La página lo retira del URL y lo conserva solo en `sessionStorage`; la API exige el grant en el encabezado `Authorization` para cada lectura y descarga. El mismo secreto aleatorio debe configurarse como `COMPANY_GRANT_SECRET` en ambos Workers; nunca debe guardarse en GitHub. No reutilizar el grant de personal del dashboard.

## API y archivos

La API busca exclusivamente las claves derivadas del código interno, con los formatos encontrados en el lote inicial:

- `ir-NNN-diagnostico.pdf` o `ir-NNN-diagnostico.html`
- `ir-NNN-plan.pdf` o `ir-NNN-plan.docx`

Cada descarga vuelve a validar grant, empresa y tipo de archivo. El bucket debe seguir con acceso público desactivado. No se aceptan nombres de archivo arbitrarios desde el navegador.

## Bitácoras e hitos

La API lee `COMPANY_PROGRESS` (KV privada) por código interno. Cada valor puede contener JSON con `companyName`, `updatedAt`, `milestones` y `bitacoras`. La estructura propuesta para cada registro es:

```json
{
  "updatedAt": "2026-11-27T12:00:00Z",
  "milestones": [{"title": "Diagnóstico", "description": "Documento revisado", "status": "Completado", "date": "2026-11-27", "mentor": "Nombre"}],
  "bitacoras": [{"title": "Sesión 1", "summary": "Avances y próximos pasos", "date": "2026-11-27", "mentor": "Nombre"}]
}
```

El Excel de bitácoras no se importa automáticamente con este cambio. Debe normalizarse e importarse a KV o migrarse al flujo de mentorías antes de presentar el historial como completo.

## Puesta en marcha

1. Crear el namespace KV privado y copiar `empresa-progreso-worker/wrangler.example.jsonc` a `wrangler.jsonc`, reemplazando el ID y el dominio.
2. Configurar `COMPANY_GRANT_SECRET` con un valor aleatorio fuerte en los dos Workers.
3. Desplegar el Worker API con la binding R2 privada existente y registrar el dominio en `ALLOWED_ORIGIN`.
4. Cambiar `empresa-progreso/config.js` al dominio real de la API.
5. Añadir la emisión de grants al Worker fuente de la Biblioteca después de validar la sesión NIT existente. La versión activa del Worker de Biblioteca se edita actualmente desde Cloudflare y no está conectada a este repositorio; antes de desplegar, debe incorporarse su fuente completa a GitHub.
6. Publicar GitHub Pages y probar con una empresa de prueba, confirmando que el token de una empresa no accede a los objetos de otra.

La biblioteca de inversión sigue siendo la pestaña de recursos generales; esta página agrega la vista individual de avance.
