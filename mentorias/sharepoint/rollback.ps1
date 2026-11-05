param([Parameter(Mandatory=$true)][string]$SiteUrl,[switch]$Apply)
if(-not $Apply){Write-Host 'DRY RUN. La reversión deshabilita los flujos y retira el frontend; no elimina listas, documentos ni bitácoras.';exit 0}
Write-Warning 'Deshabilite SWC-MENTORIAS-API y SWC-ADMIN-API desde Power Automate, retire el frontend y revoque permisos de los grupos SWC. Los datos append-only se conservan.'
Write-Host "Sitio: $SiteUrl"
