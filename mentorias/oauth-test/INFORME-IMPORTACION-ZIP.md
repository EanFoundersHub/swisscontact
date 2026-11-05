# Informe de diagnóstico del paquete SWC-OAUTH-IDENTITY-TEST

Fecha de inspección: 2026-11-04 (America/Bogota).

## Alcance y evidencia

Se comparó el paquete fallido `SWC-OAUTH-IDENTITY-TEST.zip` con los dos paquetes que Power Automate reconoció previamente:

- `SWC-MENTORIAS-API-TEST-CORREGIDO.zip`
- `SWC-ADMIN-API-TEST.zip`

La inspección fue local. No se importó ni habilitó ningún flujo, no se usaron conexiones y no se realizaron escrituras en SharePoint.

## Diferencias encontradas

| Elemento | Paquete fallido | Paquetes reconocidos | Ajuste aplicado |
| --- | --- | --- | --- |
| Raíz del ZIP | Entrada `./` y todas las rutas con prefijo `./` | `manifest.json` y `Microsoft.Flow/...` directamente en la raíz | Se archivaron rutas explícitas, sin `./` |
| Manifiesto raíz | `schema: 1.0`, un recurso Flow, sin dependencias | Mismo esquema; Flow más recursos de SharePoint | Se mantuvo un solo Flow porque el experimento no usa conectores |
| `creationType` | `New` | `New, Update` | Se alineó a `New, Update` |
| Manifiesto de flujos | `packageSchemaVersion: 1.0` y un `assetPaths` válido | Igual | Sin cambio |
| Mapas | `apisMap.json` y `connectionsMap.json` vacíos | Ambos contienen SharePoint | Se mantuvieron vacíos deliberadamente; coinciden con `connectionReferences: {}` |
| Identificadores | Carpeta/asset UUID y definición Flow UUID distintos pero coherentes | También usan un UUID de asset distinto del UUID del Flow | Sin cambio; esta diferencia no es un defecto |
| Trigger | `Request`/`Http`/`inputs`, más `metadata` y `runtimeConfiguration` propios | Solo `type`, `kind`, `inputs` | Se retiraron propiedades no demostradas por los paquetes reconocidos |
| Compose | `type`, `runAfter`, `inputs`, más `runtimeConfiguration` | `type`, `inputs`, `runAfter` | Se retiró la extensión no demostrada |
| Response | `type`, `kind`, `runAfter`, `inputs`, más `runtimeConfiguration` | `type`, `kind`, `runAfter`, `inputs` | Se retiró la extensión no demostrada |

La anomalía de empaquetado con el prefijo `./` es la diferencia que puede impedir que el importador encuentre `manifest.json` en la raíz exacta. Las demás alineaciones reducen diferencias de definición, pero esta inspección local no permite afirmar cuál mensaje interno produjo Power Automate ni que la nueva importación ya pasó.

## Manifiestos y referencias conservados

El paquete corregido incluye exactamente:

- `manifest.json`
- `Microsoft.Flow/flows/manifest.json`
- `Microsoft.Flow/flows/<assetId>/definition.json`
- `Microsoft.Flow/flows/<assetId>/apisMap.json`
- `Microsoft.Flow/flows/<assetId>/connectionsMap.json`

No se agregaron recursos de conexión ficticios. El manifiesto raíz, el manifiesto de flujos, la carpeta del asset y los mapas se validan entre sí. `definition.name` y `definition.id` comparten el mismo UUID de Flow; que este UUID sea distinto del UUID de la carpeta es consistente con ambos paquetes reconocidos.

## Acciones verificadas

`Propiedades_de_identidad_observadas` es una acción `Compose`, inicia con `runAfter: {}` y no devuelve el bearer. `Responder_sin_token_ni_headers_completos` es una acción `Response` de clase `Http`, se ejecuta únicamente después de que Compose termine con `Succeeded`, responde 200 y devuelve las observaciones. Los valores enviados por el cliente continúan marcados como no confiables.

## Validación pendiente en Power Automate

Importar `SWC-OAUTH-IDENTITY-TEST-CORREGIDO.zip` como flujo independiente y mantenerlo deshabilitado. Que el portal acepte el ZIP debe registrarse como resultado separado; no se considera probado por las validaciones locales. Antes de habilitarlo, debe configurarse en el diseñador el disparador OAuth para permitir exactamente al usuario TEST previsto, porque esa lista institucional no se inventó ni se codificó en el paquete.
