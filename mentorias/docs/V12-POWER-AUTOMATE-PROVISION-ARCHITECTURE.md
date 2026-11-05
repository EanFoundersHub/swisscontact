# Arquitectura de aprovisionamiento V1.2 sin PnP

La instalación se divide en dos flujos manuales independientes. Ambos contienen una única referencia al conector estándar SharePoint y deben mapearse a la conexión institucional FOUNDERS HUB durante la importación.

## SWC-V12-PREVIEW-TEST

- Destino codificado: `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST`.
- Inventaría sitio, listas, biblioteca, campos y vistas mediante GET.
- Intenta leer asignaciones de roles de Credenciales, Operaciones y Accesos.
- Un 403/404 de permisos se convierte en `NO_VERIFICABLE`; las demás comparaciones continúan.
- Compara plantilla, versionado de biblioteca, tipo, obligatoriedad, índice, unicidad y opciones Choice.
- Produce `Resultado_JSON` e `Informe_Markdown` como salidas de acciones Compose en el historial.
- No contiene POST, PATCH, MERGE ni DELETE y no crea archivos.

## SWC-V12-PROVISION-TEST

- Repite exactamente la auditoría del PREVIEW.
- La rama de escritura solo es alcanzable después de `Informe_Markdown`.
- Exige `APROVISIONAR-SWC12-TEST` y cero conflictos.
- Crea listas/biblioteca ausentes y columnas ausentes.
- No cambia columnas existentes, no elimina recursos, no migra documentos y no administra permisos.
- Se entrega sin importar ni habilitar.

## Límite de autoridad

Todas las operaciones se ejecutan con los permisos efectivos de FOUNDERS HUB. Si la conexión no puede enumerar asignaciones, el informe lo declara no verificable. Si no puede administrar listas, una futura ejecución autorizada de PROVISION fallará con 403; el flujo no intenta eludirlo.

Los paquetes funcionales Mentorías y Administración no fueron modificados.
