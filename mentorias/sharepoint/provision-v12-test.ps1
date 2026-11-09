param(
  [uri]$SiteUrl = 'https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST',
  [guid]$ClientId,
  [string]$ServiceAccountEmail = 'foundershub@universidadean.edu.co',
  [string[]]$AdminEmails = @('afcaballero@universidadean.edu.co'),
  [string]$Confirmation = '',
  [string]$ExecutionId = ([guid]::NewGuid().ToString()),
  [string]$ReportPath = (Join-Path $PSScriptRoot '..\docs\V12-PREVIEW-LIVE.md'),
  [string]$JournalPath = (Join-Path $PSScriptRoot '..\reports\provision-v12-journal.jsonl'),
  [string]$RecoverExecutionId = '',
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$expectedUrl = 'https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST'
$schemaPath = Join-Path $PSScriptRoot 'schema-v12.json'
if ($SiteUrl.AbsoluteUri.TrimEnd('/') -cne $expectedUrl) { throw "Destino rechazado: $($SiteUrl.AbsoluteUri)" }
if (-not (Test-Path -LiteralPath $schemaPath)) { throw "No existe el contrato $schemaPath" }
if (-not (Get-Module -ListAvailable PnP.PowerShell)) { throw 'PnP.PowerShell no está instalado. Use los flujos PREVIEW/PROVISION con FOUNDERS HUB.' }

function Normalize-Email([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw 'Dirección vacía.' }
  $candidate = $Value.Trim().ToLowerInvariant()
  if ($candidate.IndexOf('|') -ge 0) { $candidate = $candidate.Split('|')[-1].Trim() }
  try { $mail = [Net.Mail.MailAddress]::new($candidate) } catch { throw "Correo inválido: $Value" }
  if ($mail.Address.ToLowerInvariant() -cne $candidate) { throw "Identidad ambigua: $Value" }
  return $candidate
}
$service = Normalize-Email $ServiceAccountEmail
$admins = @($AdminEmails | ForEach-Object { Normalize-Email $_ } | Sort-Object -Unique)
if ($service -cne 'foundershub@universidadean.edu.co') { throw 'Cuenta de servicio incorrecta.' }
if ($admins.Count -ne 1 -or $admins[0] -cne 'afcaballero@universidadean.edu.co') { throw 'Administrador humano incorrecto.' }
if ($service -ceq $admins[0]) { throw 'Servicio y administrador deben ser distintos.' }
$schema = Get-Content -LiteralPath $schemaPath -Raw | ConvertFrom-Json -Depth 100
if ($schema.siteUrl -cne $expectedUrl -or $schema.resources.Count -ne 11) { throw 'Contrato V1.2 inválido.' }
$results = [Collections.Generic.List[object]]::new(); $permissions = [Collections.Generic.List[object]]::new()
$conflicts = [Collections.Generic.List[string]]::new(); $errors = [Collections.Generic.List[string]]::new()

function Get-ErrorClass([Exception]$Exception) {
  $status = $null; try { $status = [int]$Exception.Response.StatusCode } catch {}
  if ($status -eq 404 -or $Exception.Message -match '(?i)does not exist|not found|no se encontr') { return '404_NOT_FOUND' }
  if ($status -eq 403 -or $Exception.Message -match '(?i)access denied|unauthorized|forbidden|acceso denegado') { return '403_FORBIDDEN' }
  return 'CONNECTION_OR_PLATFORM_ERROR'
}
function Write-Journal([string]$Kind,[string]$Resource,[string]$Field='',[string]$Status='Created',[string]$Detail='') {
  $parent=Split-Path -Parent ([IO.Path]::GetFullPath($JournalPath)); if(-not(Test-Path -LiteralPath $parent)){New-Item -ItemType Directory -Path $parent|Out-Null}
  [ordered]@{executionId=$ExecutionId;utc=(Get-Date -AsUTC -Format o);kind=$Kind;resource=$Resource;field=$Field;status=$Status;detail=$Detail}|ConvertTo-Json -Compress|Add-Content -LiteralPath $JournalPath -Encoding utf8
}
function Get-ListExact([string]$Title) {
  try { return Get-PnPList -Identity $Title -Includes BaseTemplate,EnableVersioning,EnableMinorVersions,HasUniqueRoleAssignments,RoleAssignments -ErrorAction Stop }
  catch { $class=Get-ErrorClass $_.Exception; if($class -eq '404_NOT_FOUND'){return $null}; throw "$class al consultar ${Title}: $($_.Exception.Message)" }
}
function Resolve-CanonicalEmail($Principal) {
  $values=[Collections.Generic.List[string]]::new()
  if(-not[string]::IsNullOrWhiteSpace([string]$Principal.Email)){try{$values.Add((Normalize-Email ([string]$Principal.Email)))}catch{}}
  $login=[string]$Principal.LoginName; $candidate=if($login.IndexOf('|')-ge0){$login.Split('|')[-1].Trim()}else{$login.Trim()}
  if($candidate-match'^[^@\s]+@[^@\s]+\.[^@\s]+$'){try{$values.Add((Normalize-Email $candidate))}catch{}}
  $unique=@($values|Sort-Object -Unique); if($unique.Count-gt1){throw "Identidad ambigua: $login"}; if($unique.Count-eq1){return $unique[0]}; return ''
}
function Test-IsAuthorized([string]$Email) { return (-not[string]::IsNullOrWhiteSpace($Email))-and($Email-ceq$service-or$Email-ceq$admins[0]) }
function Get-EffectivePermissions([string]$Title) {
  $list=Get-ListExact $Title; if(-not$list){return}; $ctx=Get-PnPContext; $ctx.Load($list.RoleAssignments);$ctx.ExecuteQuery()
  foreach($assignment in $list.RoleAssignments){
    $ctx.Load($assignment.Member);$ctx.Load($assignment.RoleDefinitionBindings);$ctx.ExecuteQuery();$read=$false;$write=$false;$manage=$false
    foreach($binding in $assignment.RoleDefinitionBindings){$ctx.Load($binding);$ctx.ExecuteQuery();$read=$read-or$binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ViewListItems);$write=$write-or$binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::AddListItems)-or$binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::EditListItems);$manage=$manage-or($binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ManagePermissions)-and$binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ManageLists))}
    $email=Resolve-CanonicalEmail $assignment.Member
    $permissions.Add([pscustomobject]@{Resource=$Title;PrincipalType=$assignment.Member.PrincipalType.ToString();CanonicalEmail=$email;Inherited=(-not$list.HasUniqueRoleAssignments);Read=$read;Write=$write;FullControl=$manage;Authorized=(Test-IsAuthorized $email)})
  }
}
function Test-Field($Spec,$Actual) {
  $issues=[Collections.Generic.List[string]]::new();if($Actual.TypeAsString-cne$Spec.type){$issues.Add("type=$($Actual.TypeAsString)/$($Spec.type)")};if([bool]$Actual.Required-ne[bool]$Spec.required){$issues.Add('required')};if([bool]$Actual.Indexed-ne[bool]$Spec.indexed){$issues.Add('indexed')};if([bool]$Actual.EnforceUniqueValues-ne[bool]$Spec.unique){$issues.Add('unique')}
  if($Spec.type-eq'Choice'){if((@($Actual.Choices|Sort-Object)-join'|')-cne(@($Spec.choices|Sort-Object)-join'|')){$issues.Add('choice-options')}};return @($issues)
}
function Invoke-Inventory([string]$Stage) {
  foreach($resource in $schema.resources){try{$list=Get-ListExact $resource.title;if(-not$list){$results.Add([pscustomobject]@{Stage=$Stage;Resource=$resource.title;Field='';State='MISSING';Detail='404'});continue};$ok=[int]$list.BaseTemplate-eq[int]$resource.template;if(-not$ok){$conflicts.Add("$($resource.title):template")};$results.Add([pscustomobject]@{Stage=$Stage;Resource=$resource.title;Field='';State=$(if($ok){'COMPATIBLE'}else{'CONFLICT'});Detail="template=$($list.BaseTemplate)"})
    foreach($fieldSpec in $resource.fields){$label=if($fieldSpec.secret){'[CAMPO SENSIBLE OMITIDO]'}else{$fieldSpec.name};try{$field=Get-PnPField -List $resource.title -Identity $fieldSpec.name -Includes TypeAsString,Required,Indexed,EnforceUniqueValues,Choices -ErrorAction Stop}catch{$class=Get-ErrorClass $_.Exception;if($class-eq'404_NOT_FOUND'){$results.Add([pscustomobject]@{Stage=$Stage;Resource=$resource.title;Field=$label;State='MISSING';Detail='404'});continue};throw};$issues=@(Test-Field $fieldSpec $field);if($issues.Count){$conflicts.Add("$($resource.title).$label")};$results.Add([pscustomobject]@{Stage=$Stage;Resource=$resource.title;Field=$label;State=$(if($issues.Count){'CONFLICT'}else{'COMPATIBLE'});Detail=($issues-join';')})};Get-EffectivePermissions $resource.title}catch{$errors.Add("$($resource.title):$($_.Exception.Message)")}}
}
function Assert-FullControlRole {
  $matches=@(Get-PnPRoleDefinition|Where-Object{$_.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ManagePermissions)-and$_.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ManageLists)-and$_.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ViewListItems)})
  if($matches.Count-ne1){throw "Control total no identificable por BasePermissions; coincidencias=$($matches.Count)"};return $matches[0]
}
function Add-FieldFromContract($Resource,$FieldSpec) {
  $params=@{List=$Resource.title;DisplayName=$FieldSpec.name;InternalName=$FieldSpec.name;Type=$FieldSpec.type;Required=[bool]$FieldSpec.required;AddToDefaultView=(-not[bool]$FieldSpec.excludeFromViews)};if($FieldSpec.type-eq'Choice'){$params.Choices=@($FieldSpec.choices)};Add-PnPField @params|Out-Null
  if($FieldSpec.indexed-or$FieldSpec.unique){Set-PnPField -List $Resource.title -Identity $FieldSpec.name -Values @{Indexed=[bool]$FieldSpec.indexed;EnforceUniqueValues=[bool]$FieldSpec.unique}|Out-Null};Write-Journal 'Field' $Resource.title $FieldSpec.name
}
function Set-ExclusivePermissions([string]$Title,$Role) {
  $list=Get-ListExact $Title;$ctx=Get-PnPContext;if(-not$list.HasUniqueRoleAssignments){$list.BreakRoleInheritance($false,$false);$ctx.ExecuteQuery();Write-Journal 'Security' $Title '' 'Changed' 'BreakRoleInheritance(false,false)'}
  Set-PnPListPermission -Identity $Title -User $service -AddRole $Role.Name|Out-Null;Set-PnPListPermission -Identity $Title -User $admins[0] -AddRole $Role.Name|Out-Null
}
function Invoke-Recovery([string]$TargetExecution) {
  if(-not$Apply-or$Confirmation-cne'RECUPERAR-SWC12-TEST'){throw 'Recuperación exige -Apply -Confirmation RECUPERAR-SWC12-TEST.'};if(-not(Test-Path -LiteralPath $JournalPath)){throw 'No existe diario.'}
  $entries=@(Get-Content -LiteralPath $JournalPath|ForEach-Object{$_|ConvertFrom-Json}|Where-Object{$_.executionId-ceq$TargetExecution-and$_.status-ceq'Created'});if(-not$entries.Count){throw 'Sin recursos creados por esa ejecución.'}
  foreach($entry in @($entries|Where-Object kind -eq 'Field'|Sort-Object utc -Descending)){if(Get-ListExact $entry.resource){Remove-PnPField -List $entry.resource -Identity $entry.field -Force;Write-Journal 'RecoveryField' $entry.resource $entry.field 'Removed' $TargetExecution}}
  foreach($entry in @($entries|Where-Object kind -eq 'Resource'|Sort-Object utc -Descending)){if(Get-ListExact $entry.resource){Remove-PnPList -Identity $entry.resource -Force;Write-Journal 'RecoveryResource' $entry.resource '' 'Removed' $TargetExecution}}
}
if($ClientId-eq[guid]::Empty){throw 'PnP requiere un ClientId ya autorizado. Sin él use los flujos con FOUNDERS HUB.'}
Connect-PnPOnline -Url $expectedUrl -Interactive -ClientId $ClientId
$web=Get-PnPWeb -Includes Url,CurrentUser;if($web.Url.TrimEnd('/')-cne$expectedUrl){throw "Sitio resuelto incorrecto: $($web.Url)"};$connected=Normalize-Email $web.CurrentUser.Email;if($connected-cne$service-and$connected-cne$admins[0]){throw "Cuenta no autorizada: $connected"};$fullControlRole=Assert-FullControlRole
if($RecoverExecutionId){Invoke-Recovery $RecoverExecutionId;Invoke-Inventory 'POST-RECOVERY'}else{Invoke-Inventory 'PREVIEW';if($Apply){if($Confirmation-cne'APROVISIONAR-SWC12-TEST'){throw 'Apply exige la frase APROVISIONAR-SWC12-TEST.'};if($conflicts.Count-or$errors.Count){throw "Bloqueado: conflictos=$($conflicts.Count), errores=$($errors.Count)"}
  try{foreach($resource in $schema.resources){$list=Get-ListExact $resource.title;if(-not$list){New-PnPList -Title $resource.title -Template $(if($resource.template-eq101){'DocumentLibrary'}else{'GenericList'}) -OnQuickLaunch:$false|Out-Null;Write-Journal 'Resource' $resource.title};foreach($fieldSpec in $resource.fields){if(-not(Get-PnPField -List $resource.title -Identity $fieldSpec.name -ErrorAction SilentlyContinue)){Add-FieldFromContract $resource $fieldSpec}};if($resource.template-eq101){Set-PnPList -Identity $resource.title -EnableVersioning:$false -EnableMinorVersions:$false};Set-ExclusivePermissions $resource.title $fullControlRole};foreach($view in Get-PnPView -List 'SWC12_Credenciales'){if(@($view.ViewFields)-ccontains'TokenValue'){Set-PnPView -List 'SWC12_Credenciales' -Identity $view.Id -Fields @($view.ViewFields|Where-Object{$_-cne'TokenValue'})|Out-Null;Write-Journal 'View' 'SWC12_Credenciales' $view.Title 'Changed' 'TokenValue removed'}}}catch{$errors.Add("APPLY:$($_.Exception.Message)");Write-Journal 'Execution' '' '' 'Failed' $_.Exception.Message}finally{$permissions.Clear();Invoke-Inventory 'POST-APPLY'}}}
$unauthorized=@($permissions|Where-Object{(-not$_.Authorized)-and($_.Read-or$_.Write-or$_.FullControl)});$inherited=@($permissions|Where-Object Inherited)
$lines=@('# SWC Mentorías V1.2 — inventario de aprovisionamiento','',"- ExecutionId: $ExecutionId","- Sitio: $($web.Url)","- Modo: $(if($Apply){'APPLY'}else{'PREVIEW'})","- Control total verificado por BasePermissions: $($fullControlRole.Name)","- Conflictos: $($conflicts.Count)","- Errores: $($errors.Count)","- Principales no autorizados: $($unauthorized.Count)","- Asignaciones heredadas: $($inherited.Count)",'','## Esquema','','| Etapa | Recurso | Campo | Estado | Detalle |','|---|---|---|---|---|');$lines+=@($results|ForEach-Object{"| $($_.Stage) | $($_.Resource) | $($_.Field) | $($_.State) | $($_.Detail) |"});$lines+=@('','## Permisos','','| Recurso | Tipo | Identidad canónica | Heredado | Lectura | Escritura | Control total | Autorizado |','|---|---|---|---:|---:|---:|---:|---:|');$lines+=@($permissions|ForEach-Object{"| $($_.Resource) | $($_.PrincipalType) | $($_.CanonicalEmail) | $($_.Inherited) | $($_.Read) | $($_.Write) | $($_.FullControl) | $($_.Authorized) |"});$lines+=@('','## Errores');$lines+=if($errors.Count){@($errors|ForEach-Object{"- $_"})}else{'- Ninguno'};$lines+=@('','## Seguridad','- No se consultaron elementos ni valores de SWC12_Credenciales.','- TokenValue se omite de informes.','- Solo el inventario POST-APPLY sin herencia ni principales no autorizados demuestra aislamiento.')
$report=[IO.Path]::GetFullPath($ReportPath);$parent=Split-Path -Parent $report;if(-not(Test-Path -LiteralPath $parent)){New-Item -ItemType Directory -Path $parent|Out-Null};Set-Content -LiteralPath $report -Value $lines -Encoding utf8;Write-Host "Informe: $report"
if($Apply-and($errors.Count-or$unauthorized.Count-or$inherited.Count)){throw 'POST-VALIDATION falló; no se declara aislamiento efectivo.'}
