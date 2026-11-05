param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [ValidateSet('DEV','TEST','PROD')][string]$Environment='DEV',
  [switch]$Apply
)
$ErrorActionPreference='Stop'
if (-not (Get-Module -ListAvailable PnP.PowerShell)) { throw 'Instale PnP.PowerShell: Install-Module PnP.PowerShell -Scope CurrentUser' }
if (-not $Apply) { Write-Host "DRY RUN: se aprovisionaría $SiteUrl ($Environment). Use -Apply para ejecutar."; exit 0 }
Connect-PnPOnline -Url $SiteUrl -Interactive
function Ensure-List([string]$Name) {
  $list=Get-PnPList -Identity $Name -ErrorAction SilentlyContinue
  if(-not $list){ New-PnPList -Title $Name -Template GenericList -OnQuickLaunch:$false | Out-Null }
}
function Field([string]$List,[string]$Name,[string]$Type,[bool]$Required=$false,[bool]$Unique=$false) {
  if(-not (Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue)){
    Add-PnPField -List $List -DisplayName $Name -InternalName $Name -Type $Type -Required:$Required -AddToDefaultView | Out-Null
  }
  if($Unique){ Set-PnPField -List $List -Identity $Name -Values @{Indexed=$true;EnforceUniqueValues=$true} }
}
function ChoiceField([string]$List,[string]$Name,[string[]]$Choices,[bool]$Required=$false,[string]$Default='') {
  if(-not (Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue)){
    Add-PnPField -List $List -DisplayName $Name -InternalName $Name -Type Choice -Choices $Choices -Required:$Required -AddToDefaultView | Out-Null
  }
  $values=@{Choices=$Choices;Required=$Required}
  if($Default){$values.DefaultValue=$Default}
  Set-PnPField -List $List -Identity $Name -Values $values
}
$lists='SWC_Empresas','SWC_Mentores','SWC_Asignaciones','SWC_Bitacoras','SWC_BitacoraVersiones','SWC_Operaciones'
$lists|ForEach-Object{Ensure-List $_}
if(-not (Get-PnPList -Identity 'SWC_Documentos' -ErrorAction SilentlyContinue)){New-PnPList -Title 'SWC_Documentos' -Template DocumentLibrary -OnQuickLaunch:$false|Out-Null}
Set-PnPList -Identity SWC_Documentos -EnableVersioning $true -EnableMinorVersions $false -EnableContentTypes $true
Field SWC_Empresas EmpresaId Text $true $true; Field SWC_Empresas Nombre Text $true; Field SWC_Empresas DiagnosticoUrl URL; Field SWC_Empresas DiagnosticoPath Text
Field SWC_Empresas EntregablesEtapa0 Note; Field SWC_Empresas Activa Boolean
Field SWC_Mentores MentorId Text $true $true; Field SWC_Mentores Email Text $true $true; Field SWC_Mentores Nombre Text $true; ChoiceField SWC_Mentores Rol @('Mentor','Administrador') $true 'Mentor'; Field SWC_Mentores Activo Boolean
Field SWC_Asignaciones AsignacionId Text $true $true; Field SWC_Asignaciones EmpresaId Text $true; Field SWC_Asignaciones MentorEmail Text $true; Field SWC_Asignaciones Activa Boolean
Field SWC_Bitacoras BitacoraId Text $true $true; Field SWC_Bitacoras EmpresaId Text $true; Field SWC_Bitacoras RevisionActual Number $true; ChoiceField SWC_Bitacoras Estado @('Activa','Anulada') $true 'Activa'
Field SWC_Bitacoras VersionVigenteId Number $true
@('BitacoraId','EmpresaId','Objetivo','Actividades','Avances','Compromisos','AutorEmail','IdempotencyKey')|ForEach-Object{Field SWC_BitacoraVersiones $_ $(if($_ -in 'Actividades','Avances','Compromisos'){'Note'}else{'Text'}) $true}
Field SWC_BitacoraVersiones Observaciones Note $false
Field SWC_BitacoraVersiones Revision Number $true; Field SWC_BitacoraVersiones FechaSesion DateTime $true; Field SWC_BitacoraVersiones DuracionMinutos Number $true; Field SWC_BitacoraVersiones ContenidoHash Text $true
ChoiceField SWC_BitacoraVersiones EstadoRevision @('Candidata','Vigente','Historica','Conflicto') $true 'Candidata'
Field SWC_Operaciones IdempotencyKey Text $true $true; Field SWC_Operaciones ContenidoHash Text $true; Field SWC_Operaciones ResultadoJson Note; ChoiceField SWC_Operaciones Estado @('Pendiente','Confirmada','Fallida') $true 'Pendiente'
@('EmpresaId','BitacoraId','DocumentoId','VersionDocumento','IdempotencyKey','ContenidoHash','AutorEmail')|ForEach-Object{Field SWC_Documentos $_ $(if($_ -eq 'VersionDocumento'){'Number'}else{'Text'})}
Set-PnPField -List SWC_Documentos -Identity IdempotencyKey -Values @{Indexed=$true;EnforceUniqueValues=$true}
ChoiceField SWC_Documentos Tipo @('PlanAccion','Transcripcion','Etapa0') $true
Field SWC_Documentos UrlDescarga URL $true
Field SWC_Documentos NombreArchivo Text $true
Write-Host 'Aprovisionamiento terminado. Configure permisos y grupos según INSTALL.md antes de habilitar el frontend.'
