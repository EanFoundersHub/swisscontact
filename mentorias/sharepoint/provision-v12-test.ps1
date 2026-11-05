param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [Parameter(Mandatory=$true)][string]$ServiceAccountEmail,
  [Parameter(Mandatory=$true)][string[]]$AdminEmails,
  [switch]$Apply
)
$ErrorActionPreference='Stop'
if($SiteUrl -notmatch '/sites/SWC-Mentorias-TEST/?$'){throw 'V1.2 solo puede aprovisionarse en /sites/SWC-Mentorias-TEST.'}
if(-not (Get-Module -ListAvailable PnP.PowerShell)){throw 'Instale PnP.PowerShell.'}
if(-not $Apply){Write-Host "DRY RUN V1.2 TEST: $SiteUrl. Use -Apply para ejecutar.";exit 0}
Connect-PnPOnline -Url $SiteUrl -Interactive
$connectedEmail=(Get-PnPWeb -Includes CurrentUser).CurrentUser.Email
$allowedPrincipals=@($ServiceAccountEmail)+@($AdminEmails)
if($connectedEmail -notin $allowedPrincipals){throw "La cuenta conectada $connectedEmail debe figurar en AdminEmails o ser la cuenta Founders Hub; de lo contrario SharePoint conservaría un permiso adicional al romper herencia."}
function Ensure-List([string]$Name,[string]$Template='GenericList'){$list=Get-PnPList -Identity $Name -ErrorAction SilentlyContinue;if(-not $list){New-PnPList -Title $Name -Template $Template -OnQuickLaunch:$false|Out-Null}}
function Field([string]$List,[string]$Name,[string]$Type,[bool]$Required=$false,[bool]$Unique=$false,[bool]$AddToView=$true){$f=Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue;if(-not $f){Add-PnPField -List $List -DisplayName $Name -InternalName $Name -Type $Type -Required:$Required -AddToDefaultView:$AddToView|Out-Null};if($Unique){Set-PnPField -List $List -Identity $Name -Values @{Indexed=$true;EnforceUniqueValues=$true}|Out-Null}}
function ChoiceField([string]$List,[string]$Name,[string[]]$Choices,[bool]$Required=$false,[string]$Default=''){if(-not(Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue)){Add-PnPField -List $List -DisplayName $Name -InternalName $Name -Type Choice -Choices $Choices -Required:$Required -AddToDefaultView|Out-Null};$v=@{Choices=$Choices};if($Default){$v.DefaultValue=$Default};Set-PnPField -List $List -Identity $Name -Values $v|Out-Null}
$lists='SWC12_Empresas','SWC12_Mentores','SWC12_Credenciales','SWC12_Asignaciones','SWC12_Rubricas','SWC12_Bitacoras','SWC12_BitacoraVersiones','SWC12_Operaciones','SWC12_Accesos'
$lists|ForEach-Object{Ensure-List $_}
Ensure-List 'SWC12_Documentos' 'DocumentLibrary';Set-PnPList -Identity SWC12_Documentos -EnableVersioning $false -EnableMinorVersions $false
Field SWC12_Empresas EmpresaId Text $true $true;Field SWC12_Empresas NIT Text $true;Field SWC12_Empresas NITNormalizado Text $true;Field SWC12_Empresas RazonSocial Text $true;Field SWC12_Empresas NombreComercial Text;Field SWC12_Empresas Sector Text;Field SWC12_Empresas Ciudad Text;Field SWC12_Empresas DiagnosticoPath Text;Field SWC12_Empresas Activa Boolean;Field SWC12_Empresas Avance Text
Field SWC12_Mentores MentorId Text $true $true;Field SWC12_Mentores Nombre Text $true;Field SWC12_Mentores Email Text;ChoiceField SWC12_Mentores Rol @('Mentor','Administrador') $true 'Mentor';Field SWC12_Mentores Activo Boolean
Field SWC12_Credenciales CredentialId Text $true $true;Field SWC12_Credenciales MentorId Text $true;Field SWC12_Credenciales TokenValue Text $true $true $false;Field SWC12_Credenciales ValidaDesde DateTime $true;Field SWC12_Credenciales ExpiraEn DateTime $true;Field SWC12_Credenciales Activa Boolean;Field SWC12_Credenciales RevocadaEn DateTime;Field SWC12_Credenciales Version Number $true
Field SWC12_Asignaciones AsignacionId Text $true $true;Field SWC12_Asignaciones MentorId Text $true;Field SWC12_Asignaciones EmpresaId Text $true;Field SWC12_Asignaciones Activa Boolean
Field SWC12_Rubricas RubricaId Text $true $true;Field SWC12_Rubricas EmpresaId Text $true;Field SWC12_Rubricas Version Number $true;Field SWC12_Rubricas ContenidoJson Note $true;ChoiceField SWC12_Rubricas EstadoRevision @('Vigente','Historica') $true 'Vigente';Field SWC12_Rubricas FechaEvaluacion DateTime
Field SWC12_Bitacoras BitacoraId Text $true $true;Field SWC12_Bitacoras EmpresaId Text $true;Field SWC12_Bitacoras RevisionActual Number $true;Field SWC12_Bitacoras VersionVigenteId Number $true;ChoiceField SWC12_Bitacoras Estado @('Activa','Anulada') $true 'Activa'
@('BitacoraId','EmpresaId','Actividad','MentorId','IdempotencyKey','ContenidoHash')|ForEach-Object{Field SWC12_BitacoraVersiones $_ Text $true};@('Acompanamiento','Avances','Compromisos')|ForEach-Object{Field SWC12_BitacoraVersiones $_ Note $true};Field SWC12_BitacoraVersiones Observaciones Note;Field SWC12_BitacoraVersiones Revision Number $true;Field SWC12_BitacoraVersiones FechaSesion DateTime $true;Field SWC12_BitacoraVersiones DuracionMinutos Number $true;ChoiceField SWC12_BitacoraVersiones EstadoRevision @('Candidata','Vigente','Historica','Conflicto') $true 'Candidata'
Field SWC12_Operaciones IdempotencyKey Text $true $true;Field SWC12_Operaciones MentorId Text $true;Field SWC12_Operaciones EmpresaId Text $true;Field SWC12_Operaciones ContenidoHash Text $true;Field SWC12_Operaciones ResultadoJson Note;Field SWC12_Operaciones ExpiraEn DateTime $true;ChoiceField SWC12_Operaciones Estado @('Pendiente','Confirmada','Fallida') $true 'Pendiente'
Field SWC12_Accesos RequestId Text $true $true;Field SWC12_Accesos MentorId Text;Field SWC12_Accesos Operacion Text $true;Field SWC12_Accesos EmpresaId Text;ChoiceField SWC12_Accesos Resultado @('Autorizado','Denegado','Limitado','Error') $true;Field SWC12_Accesos Fecha DateTime $true
@('EmpresaId','BitacoraId','DocumentoId','IdempotencyKey','ContenidoHash','MentorId','NombreArchivo')|ForEach-Object{Field SWC12_Documentos $_ Text};Field SWC12_Documentos VersionDocumento Number;ChoiceField SWC12_Documentos Tipo @('PlanAccion','Transcripcion','Documento','Etapa0') $true;Field SWC12_Documentos UrlDescarga URL $true;Set-PnPField -List SWC12_Documentos -Identity IdempotencyKey -Values @{Indexed=$true;EnforceUniqueValues=$true}|Out-Null
function Protect-List([string]$Name){Set-PnPList -Identity $Name -BreakRoleInheritance -ClearSubScopes;Set-PnPListPermission -Identity $Name -User $ServiceAccountEmail -AddRole 'Full Control';$AdminEmails|ForEach-Object{Set-PnPListPermission -Identity $Name -User $_ -AddRole 'Full Control'}}
@('SWC12_Credenciales','SWC12_Operaciones','SWC12_Accesos')|ForEach-Object{Protect-List $_}
$views=Get-PnPView -List SWC12_Credenciales
foreach($view in $views){$fields=@($view.ViewFields|Where-Object{$_ -ne 'TokenValue'});Set-PnPView -List SWC12_Credenciales -Identity $view.Id -Fields $fields|Out-Null}
Write-Host 'V1.2 TEST aprovisionada. Las listas sensibles tienen herencia rota y acceso exclusivo de la conexión y administradores indicados.'
