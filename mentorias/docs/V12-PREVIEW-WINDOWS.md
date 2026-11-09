# Ejecución exacta del PREVIEW en Windows

PnP.PowerShell requiere PowerShell 7.4 o posterior. No usar Windows PowerShell 5.1.

## 1. Abrir PowerShell 7

```powershell
pwsh
$PSVersionTable.PSVersion
```

## 2. Instalar o actualizar PnP.PowerShell

```powershell
Install-Module PnP.PowerShell -Scope CurrentUser
Import-Module PnP.PowerShell
Get-Module PnP.PowerShell | Select-Object Name,Version
```

## 3. Definir el ClientId institucional

Desde septiembre de 2024, PnP exige una aplicación Entra propia para autenticación interactiva. No hay un ClientId en el repositorio y no debe inventarse.

```powershell
$pnpClientId = [guid]'<CLIENT-ID-INSTITUCIONAL-PNP>'
```

La aplicación debe estar autorizada para consultar el sitio, campos, vistas y asignaciones de roles. La cuenta que inicia sesión debe poder enumerar permisos en el sitio TEST.

## 4. Ejecutar PREVIEW

```powershell
Set-Location 'C:\Users\afcaballero\Downloads\Swisscontact\mentoria-v1\mentorias'

.\sharepoint\provision-v12-test.ps1 `
  -SiteUrl 'https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST' `
  -ClientId $pnpClientId `
  -ServiceAccountEmail 'foundershub@universidadean.edu.co' `
  -AdminEmails 'afcaballero@universidadean.edu.co' `
  -ReportPath 'C:\Users\afcaballero\Downloads\Swisscontact\mentoria-v1\mentorias\docs\V12-PREVIEW-LIVE.md'
```

No agregar `-Apply`. Autenticarse como `afcaballero@universidadean.edu.co` o `foundershub@universidadean.edu.co`. El script rechazará otra identidad.

## 5. Verificar resultado

```powershell
Get-Item 'C:\Users\afcaballero\Downloads\Swisscontact\mentoria-v1\mentorias\docs\V12-PREVIEW-LIVE.md' |
  Select-Object FullName,Length,LastWriteTime
```

Si falta el ClientId institucional, la auditoría autenticada permanece bloqueada. No sustituirlo por un identificador de ejemplo.
