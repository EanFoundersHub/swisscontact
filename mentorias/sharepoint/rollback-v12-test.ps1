param([Parameter(Mandatory=$true)][string]$SiteUrl,[switch]$Apply,[switch]$DeleteTestData)
$ErrorActionPreference='Stop'
if($SiteUrl -notmatch '/sites/SWC-Mentorias-TEST/?$'){throw 'La reversión V1.2 solo admite SWC-Mentorias-TEST.'}
if(-not $Apply){Write-Host 'DRY RUN: deshabilitar flujos V1.2, revocar credenciales y retirar configuración del frontend. Los datos TEST se conservan por defecto.';exit 0}
Connect-PnPOnline -Url $SiteUrl -Interactive
$items=Get-PnPListItem -List SWC12_Credenciales -PageSize 500
foreach($item in $items){if($item['Activa']){Set-PnPListItem -List SWC12_Credenciales -Identity $item.Id -Values @{Activa=$false;RevocadaEn=(Get-Date).ToUniversalTime()}|Out-Null}}
Write-Host 'Credenciales V1.2 TEST revocadas. Deshabilite manualmente ambos flujos V1.2.'
if($DeleteTestData){$names='SWC12_Documentos','SWC12_Accesos','SWC12_Operaciones','SWC12_BitacoraVersiones','SWC12_Bitacoras','SWC12_Rubricas','SWC12_Asignaciones','SWC12_Credenciales','SWC12_Mentores','SWC12_Empresas';foreach($name in $names){if(Get-PnPList -Identity $name -ErrorAction SilentlyContinue){Remove-PnPList -Identity $name -Force}};Write-Warning 'Se eliminaron exclusivamente listas SWC12_* del sitio TEST.'}
