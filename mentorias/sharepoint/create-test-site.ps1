param(
  [Parameter(Mandatory=$true)][string]$TenantAdminUrl,
  [Parameter(Mandatory=$true)][string]$OwnerEmail,
  [string]$SiteAlias='SWC-Mentorias-TEST',
  [switch]$Apply
)
$ErrorActionPreference='Stop'
$tenantHost=([uri]$TenantAdminUrl).Host
if($tenantHost -notmatch '-admin\.sharepoint\.com$'){throw 'TenantAdminUrl debe ser https://TENANT-admin.sharepoint.com'}
$siteUrl="https://$($tenantHost -replace '-admin\.sharepoint\.com$','.sharepoint.com')/sites/$SiteAlias"
if(-not $Apply){Write-Host "DRY RUN: se crearía $siteUrl, propietario $OwnerEmail. Use -Apply con una cuenta SharePoint Admin.";exit 0}
Connect-PnPOnline -Url $TenantAdminUrl -Interactive
$existing=Get-PnPTenantSite -Url $siteUrl -ErrorAction SilentlyContinue
if(-not $existing){New-PnPSite -Type TeamSiteWithoutMicrosoft365Group -Title 'Swisscontact Mentorías TEST' -Alias $SiteAlias -Owner $OwnerEmail -IsPublic:$false | Out-Null}
Write-Host "Sitio TEST disponible: $siteUrl"
