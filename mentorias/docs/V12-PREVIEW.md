# Informe PREVIEW de preinstalación V1.2

Fecha: 5 de noviembre de 2026. Base auditada: `cef699a98a99e18e498bb4ccaecff74ac17dc7b6`.

## Resultado local

- El script valida exactamente `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST` tanto antes como después de conectar.
- PREVIEW establece una conexión autenticada de solo lectura, inventaría listas/bibliotecas, columnas, vistas, permisos y subámbitos, y escribe un informe local.
- Compara plantilla, tipo, obligatoriedad, índice, unicidad y opciones Choice.
- Una diferencia existente se clasifica como `CONFLICTO`; `-Apply` se detiene antes de escribir. Solo crea recursos ausentes.
- Comprueba que el rol solicitado exista mediante `Get-PnPRoleDefinition`; no inventa administradores.
- No usa `ClearSubScopes`. Si encuentra permisos únicos en elementos de una lista sensible, informa conflicto y detiene Apply.
- Después de Apply enumera asignaciones efectivas y rechaza principales distintos de Founders Hub/administradores, salvo Limited Access generado por SharePoint.

## Ejecución live pendiente

No se ejecutó el PREVIEW contra SharePoint porque esta sesión no recibió una conexión institucional autenticada ni los valores reales de `ServiceAccountEmail` y `AdminEmails`. El resultado efectivo deberá generarse así, sin `-Apply`:

```powershell
./sharepoint/provision-v12-test.ps1 `
  -SiteUrl 'https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST' `
  -ServiceAccountEmail '<FOUNDERS-HUB-REAL>' `
  -AdminEmails '<ADMIN-REAL-1>','<ADMIN-REAL-2>' `
  -ReportPath './docs/V12-PREVIEW-LIVE.md'
```

Esta ejecución consulta SharePoint y genera el informe, pero no realiza escrituras. No debe usarse `-Apply` hasta resolver todos los conflictos y revisar el informe live.
