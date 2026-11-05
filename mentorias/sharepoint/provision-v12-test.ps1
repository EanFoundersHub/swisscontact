param(
  [Parameter(Mandatory=$true)][uri]$SiteUrl,
  [Parameter(Mandatory=$true)][guid]$ClientId,
  [string]$ServiceAccountEmail='foundershub@universidadean.edu.co',
  [string[]]$AdminEmails=@('afcaballero@universidadean.edu.co'),
  [string]$RoleName='Full Control',
  [string]$ReportPath=(Join-Path $PSScriptRoot '..\docs\V12-PREVIEW-LIVE.md'),
  [switch]$Apply
)
$ErrorActionPreference='Stop'
$expectedHost='universidadeaneduco.sharepoint.com'
$expectedPath='/sites/SWC-Mentorias-TEST'
$expectedUrl="https://$expectedHost$expectedPath"
$expectedService='foundershub@universidadean.edu.co'
$expectedAdmins=@('afcaballero@universidadean.edu.co')
if($SiteUrl.AbsoluteUri-cne$expectedUrl){throw "Destino rechazado. Debe ser exactamente $expectedUrl"}
if(-not (Get-Module -ListAvailable PnP.PowerShell)){throw 'Instale PnP.PowerShell.'}
function Normalize-Email([string]$Value){
 if([string]::IsNullOrWhiteSpace($Value)){throw 'Dirección de correo vacía.'}
 $candidate=$Value.Trim().ToLowerInvariant();if($candidate.IndexOf('|')-ge0){$parts=@($candidate.Split('|')|Where-Object{$_});$candidate=$parts[-1].Trim()}
 try{$mail=[Net.Mail.MailAddress]::new($candidate)}catch{throw "Dirección de correo inválida: $Value"}
 if($mail.Address.ToLowerInvariant()-cne$candidate){throw "Dirección ambigua o no canónica: $Value"};return $candidate
}
$service=Normalize-Email $ServiceAccountEmail
$AdminEmails=@($AdminEmails|ForEach-Object{Normalize-Email $_}|Select-Object -Unique)
if($service-cne$expectedService){throw "Cuenta de servicio rechazada. Debe ser exactamente $expectedService"}
if($AdminEmails.Count-ne$expectedAdmins.Count -or @($AdminEmails|Where-Object{$_-notin$expectedAdmins}).Count){throw "Administradores rechazados. La única cuenta autorizada es $($expectedAdmins-join ', ')"}
if($service-in$AdminEmails){throw 'La cuenta de servicio no puede confundirse con un administrador humano.'}

function F($name,$type,$required=$false,$indexed=$false,$unique=$false,$view=$true,$choices=@()){[ordered]@{Name=$name;Type=$type;Required=[bool]$required;Indexed=[bool]$indexed;Unique=[bool]$unique;View=[bool]$view;Choices=@($choices)}}
$schema=[ordered]@{
 SWC12_Empresas=@{Template='GenericList';Fields=@(F EmpresaId Text $true $true $true;F NIT Text $true;F NITNormalizado Text $true;F RazonSocial Text $true;F NombreComercial Text;F Sector Text;F Ciudad Text;F DiagnosticoPath Text;F Activa Boolean;F Avance Text)}
 SWC12_Mentores=@{Template='GenericList';Fields=@(F MentorId Text $true $true $true;F Nombre Text $true;F Email Text;F Rol Choice $true $false $false $true @('Mentor','Administrador');F Activo Boolean)}
 SWC12_Credenciales=@{Template='GenericList';Fields=@(F CredentialId Text $true $true $true;F MentorId Text $true;F TokenValue Text $true $true $true $false;F ValidaDesde DateTime $true;F ExpiraEn DateTime $true;F Activa Boolean;F RevocadaEn DateTime;F Version Number $true)}
 SWC12_Asignaciones=@{Template='GenericList';Fields=@(F AsignacionId Text $true $true $true;F MentorId Text $true;F EmpresaId Text $true;F Activa Boolean)}
 SWC12_Rubricas=@{Template='GenericList';Fields=@(F RubricaId Text $true $true $true;F EmpresaId Text $true;F Version Number $true;F ContenidoJson Note $true;F EstadoRevision Choice $true $false $false $true @('Vigente','Historica');F FechaEvaluacion DateTime)}
 SWC12_Bitacoras=@{Template='GenericList';Fields=@(F BitacoraId Text $true $true $true;F EmpresaId Text $true;F RevisionActual Number $true;F VersionVigenteId Number $true;F Estado Choice $true $false $false $true @('Activa','Anulada'))}
 SWC12_BitacoraVersiones=@{Template='GenericList';Fields=@(F BitacoraId Text $true;F EmpresaId Text $true;F Actividad Text $true;F MentorId Text $true;F IdempotencyKey Text $true;F ContenidoHash Text $true;F Acompanamiento Note $true;F Avances Note $true;F Compromisos Note $true;F Observaciones Note;F Revision Number $true;F FechaSesion DateTime $true;F DuracionMinutos Number $true;F EstadoRevision Choice $true $false $false $true @('Candidata','Vigente','Historica','Conflicto'))}
 SWC12_Operaciones=@{Template='GenericList';Fields=@(F IdempotencyKey Text $true $true $true;F MentorId Text $true;F EmpresaId Text $true;F ContenidoHash Text $true;F ResultadoJson Note;F ExpiraEn DateTime $true;F Estado Choice $true $false $false $true @('Pendiente','Confirmada','Fallida'))}
 SWC12_Accesos=@{Template='GenericList';Fields=@(F RequestId Text $true $true $true;F MentorId Text;F Operacion Text $true;F EmpresaId Text;F Resultado Choice $true $false $false $true @('Autorizado','Denegado','Limitado','Error');F Fecha DateTime $true)}
 SWC12_DocumentosCabecera=@{Template='GenericList';Fields=@(F DocumentoId Text $true $true $true;F EmpresaId Text $true $true;F VersionActual Number $true;F ItemVigenteId Number $true;F Estado Choice $true $false $false $true @('Activo','Inactivo'))}
 SWC12_Documentos=@{Template='DocumentLibrary';Fields=@(F EmpresaId Text;F BitacoraId Text;F DocumentoId Text $false $true;F DocumentoAnteriorID Text;F IdempotencyKey Text $false $true $true;F ContenidoHash Text;F MentorId Text;F NombreArchivo Text;F VersionDocumento Number;F FechaCarga DateTime;F EsVigente Boolean;F EstadoVersion Choice $false $false $false $true @('Candidata','Vigente','Historica','Conflicto');F Tipo Choice $true $false $false $true @('PlanAccion','Transcripcion','Documento','Etapa0');F UrlDescarga URL $true)}
}
$sensitive=@('SWC12_Credenciales','SWC12_Operaciones','SWC12_Accesos')
$rows=[Collections.Generic.List[object]]::new();$permissionRows=[Collections.Generic.List[object]]::new();$conflicts=[Collections.Generic.List[string]]::new();$securityFindings=[Collections.Generic.List[string]]::new();$planned=[Collections.Generic.List[string]]::new()
function Add-Row($list,$field,$status,$detail){$rows.Add([pscustomobject]@{List=$list;Field=$field;Status=$status;Detail=$detail})}
function Type-Ok($expected,$actual){$actual -eq $expected -or ($expected -eq 'URL' -and $actual -eq 'URL')}
function Resolve-PrincipalEmail($member){
 $candidates=[Collections.Generic.List[string]]::new();if(-not[string]::IsNullOrWhiteSpace($member.Email)){try{$candidates.Add((Normalize-Email $member.Email))}catch{}}
 $login=[string]$member.LoginName;if($login.IndexOf('|')-ge0){$tail=$login.Split('|')[-1].Trim();if($tail-match'^[^@\s]+@[^@\s]+\.[^@\s]+$'){try{$candidates.Add((Normalize-Email $tail))}catch{}}}elseif($login-match'^[^@\s]+@[^@\s]+\.[^@\s]+$'){try{$candidates.Add((Normalize-Email $login))}catch{}}
 $unique=@($candidates|Select-Object -Unique);if($unique.Count-gt1){throw "Principal ambiguo: $login"};if($unique.Count-eq1){return $unique[0]};return ''
}
function Test-AllowedPrincipalEmail([string]$email){if([string]::IsNullOrWhiteSpace($email)){return $false};return $email-ceq$service -or $email-cin$AdminEmails}
function Get-Permissions($list){
 $ctx=Get-PnPContext;$obj=Get-PnPList -Identity $list -Includes HasUniqueRoleAssignments,RoleAssignments
 $ctx.Load($obj.RoleAssignments);$ctx.ExecuteQuery()
 foreach($ra in $obj.RoleAssignments){
  $ctx.Load($ra.Member);$ctx.Load($ra.RoleDefinitionBindings);$ctx.ExecuteQuery();$read=$false;$write=$false;$full=$false;$roleNames=[Collections.Generic.List[string]]::new()
  foreach($binding in $ra.RoleDefinitionBindings){$ctx.Load($binding);$ctx.ExecuteQuery();$roleNames.Add($binding.Name);if($binding.RoleTypeKind.ToString()-eq'Administrator' -or $binding.Name-ceq$RoleName){$full=$true};if($binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::ViewListItems)){$read=$true};if($binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::AddListItems) -or $binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::EditListItems) -or $binding.BasePermissions.Has([Microsoft.SharePoint.Client.PermissionKind]::DeleteListItems)){$write=$true}}
  $email=Resolve-PrincipalEmail $ra.Member;$ptype=$ra.Member.PrincipalType.ToString();$category=switch -Regex($ptype){'SharePointGroup'{'Grupo SharePoint';break}'SecurityGroup'{'Grupo Microsoft Entra/seguridad';break}'DistributionList'{'Grupo de distribución';break}'User'{'Usuario';break}default{"Principal $ptype"}}
  $permissionRows.Add([pscustomobject]@{List=$list;Principal=$ra.Member.Title;LoginName=$ra.Member.LoginName;Email=$email;Type=$category;Origin=$(if($obj.HasUniqueRoleAssignments){'Directo/único'}else{'Heredado del sitio'});Roles=($roleNames-join ', ');FullControl=$full;CanRead=$read;CanWrite=$write;Authorized=(Test-AllowedPrincipalEmail $email)})
 }
}
Connect-PnPOnline -Url $SiteUrl.AbsoluteUri -Interactive -ClientId $ClientId
$web=Get-PnPWeb -Includes Url,CurrentUser
if(([uri]$web.Url).DnsSafeHost -ne $expectedHost -or ([uri]$web.Url).AbsolutePath.TrimEnd('/') -cne $expectedPath){throw "La conexión resolvió un sitio distinto: $($web.Url)"}
$connectedEmail=Normalize-Email $web.CurrentUser.Email;$allowed=@($service)+$AdminEmails
if($connectedEmail-cne$service -and $connectedEmail-cnotin$AdminEmails){throw "La cuenta conectada $connectedEmail no es la cuenta de servicio ni el administrador autorizado."}
$role=Get-PnPRoleDefinition -Identity $RoleName -ErrorAction SilentlyContinue
if(-not $role){throw "El nivel de permisos '$RoleName' no existe en este sitio."}

foreach($listName in $schema.Keys){
 $spec=$schema[$listName];$list=Get-PnPList -Identity $listName -Includes BaseTemplate,EnableVersioning,EnableMinorVersions,HasUniqueRoleAssignments -ErrorAction SilentlyContinue
 if(-not $list){Add-Row $listName '(lista)' 'NUEVO' "Crear $($spec.Template)";$planned.Add("Crear $listName ($($spec.Template))");continue}
 $expectedTemplate=if($spec.Template -eq 'DocumentLibrary'){101}else{100};if($list.BaseTemplate -ne $expectedTemplate){$msg="Tipo existente $($list.BaseTemplate), esperado $expectedTemplate";Add-Row $listName '(lista)' 'CONFLICTO' $msg;$conflicts.Add("${listName}: $msg")}else{Add-Row $listName '(lista)' 'COMPATIBLE' $spec.Template}
 if($listName -eq 'SWC12_Documentos' -and ($list.EnableVersioning -or $list.EnableMinorVersions)){$msg='Versionado nativo activo; V1.2 exige archivos append-only sin versionado nativo.';Add-Row $listName '(versionado)' 'CONFLICTO' $msg;$conflicts.Add("${listName}: $msg")}
 foreach($fieldSpec in $spec.Fields){
  $fieldLabel=if($listName-eq'SWC12_Credenciales' -and $fieldSpec.Name-eq'TokenValue'){'[CAMPO SENSIBLE OMITIDO]'}else{$fieldSpec.Name}
  $f=Get-PnPField -List $listName -Identity $fieldSpec.Name -Includes TypeAsString,Required,Indexed,EnforceUniqueValues,Choices -ErrorAction SilentlyContinue
  if(-not $f){Add-Row $listName $fieldLabel 'NUEVO' "Tipo=$($fieldSpec.Type); Required=$($fieldSpec.Required); Indexed=$($fieldSpec.Indexed); Unique=$($fieldSpec.Unique)";$planned.Add("Crear columna $listName.$fieldLabel");continue}
  $issues=@();if(-not(Type-Ok $fieldSpec.Type $f.TypeAsString)){$issues+="tipo=$($f.TypeAsString)/$($fieldSpec.Type)"};if([bool]$f.Required-ne$fieldSpec.Required){$issues+="required=$($f.Required)/$($fieldSpec.Required)"};if([bool]$f.Indexed-ne$fieldSpec.Indexed){$issues+="indexed=$($f.Indexed)/$($fieldSpec.Indexed)"};if([bool]$f.EnforceUniqueValues-ne$fieldSpec.Unique){$issues+="unique=$($f.EnforceUniqueValues)/$($fieldSpec.Unique)"};if($fieldSpec.Type-eq'Choice'){$actual=@($f.Choices|Sort-Object);$expected=@($fieldSpec.Choices|Sort-Object);if(($actual-join '|')-ne($expected-join '|')){$issues+="choices=$($actual-join ',')/$($expected-join ',')"}}
  if($issues.Count){$msg=$issues-join '; ';Add-Row $listName $fieldLabel 'CONFLICTO' $msg;$conflicts.Add("$listName.${fieldLabel}: $msg")}else{Add-Row $listName $fieldLabel 'COMPATIBLE' 'Coincide'}
 }
 if($listName -in $sensitive){Get-Permissions $listName;$unexpectedExisting=@($permissionRows|Where-Object{$_.List -eq $listName -and -not $_.Authorized -and ($_.CanRead -or $_.CanWrite -or $_.FullControl)});if($unexpectedExisting.Count){$securityFindings.Add("$listName permite acceso a principales no autorizados: $($unexpectedExisting.Principal-join ', ').")};if(-not $list.HasUniqueRoleAssignments){$securityFindings.Add("$listName hereda permisos del sitio; revisar todos los principales con lectura o escritura antes de Apply.")};$planned.Add("Restringir $listName a la cuenta de servicio y al administrador humano declarados, sin limpiar subámbitos.")}
}
$sensitiveViews=@();$cred=Get-PnPList -Identity SWC12_Credenciales -ErrorAction SilentlyContinue;if($cred){foreach($view in Get-PnPView -List SWC12_Credenciales){if(@($view.ViewFields)-contains'TokenValue'){$sensitiveViews+=$view.Title;$securityFindings.Add("La vista '$($view.Title)' expone el campo sensible de credencial.");$planned.Add("Retirar el campo sensible de la vista '$($view.Title)'")}}}

$lines=@('# PREVIEW de aprovisionamiento V1.2 TEST','',"- Fecha UTC: $(Get-Date -AsUTC -Format o)","- Sitio verificado: $($web.Url)","- Modo: $(if($Apply){'APPLY solicitado'}else{'PREVIEW autenticado de solo lectura'})","- Cuenta conectada: $connectedEmail","- Cuenta de servicio verificada: $service","- Administrador humano verificado: $($AdminEmails-join ', ')","- Rol verificado: $RoleName","- Conflictos estructurales: $($conflicts.Count)","- Hallazgos de seguridad: $($securityFindings.Count)",'','## Compatibilidad de columnas','','| Lista | Columna/recurso | Estado | Detalle |','|---|---|---|---|')
$lines+=@($rows|ForEach-Object{"| $($_.List) | $($_.Field) | $($_.Status) | $($_.Detail -replace '\|','/') |"});$lines+=@('','## Permisos efectivos','','| Lista | Principal | Login | Correo resuelto | Tipo | Origen | Roles | Full Control | Lectura | Escritura | Autorizado |','|---|---|---|---|---|---|---|---:|---:|---:|---:|');$lines+=@($permissionRows|ForEach-Object{"| $($_.List) | $($_.Principal) | $($_.LoginName) | $($_.Email) | $($_.Type) | $($_.Origin) | $($_.Roles) | $($_.FullControl) | $($_.CanRead) | $($_.CanWrite) | $($_.Authorized) |"});$lines+=@('','## Hallazgos de seguridad');$lines+=if($securityFindings.Count){@($securityFindings|ForEach-Object{"- $_"})}else{'- Ninguno'};$lines+=@('','## Cambios previstos');$lines+=if($planned.Count){@($planned|ForEach-Object{"- $_"})}else{'- Ninguno'};$lines+=@('','## Campo sensible de credencial',"- Vistas que lo exponen: $(if($sensitiveViews.Count){$sensitiveViews-join ', '}else{'ninguna'})",'- No se consultaron ni exportaron elementos o valores de la lista de credenciales.','- Riesgo: la credencial se almacena en texto; su protección depende del aislamiento de permisos, entradas/salidas seguras, caducidad y revocación.','','## Conflictos estructurales');$lines+=if($conflicts.Count){@($conflicts|ForEach-Object{"- $_"})}else{'- Ninguno'}
$reportFull=[IO.Path]::GetFullPath($ReportPath);$parent=Split-Path -Parent $reportFull;if(-not(Test-Path -LiteralPath $parent)){New-Item -ItemType Directory -Path $parent|Out-Null};Set-Content -LiteralPath $reportFull -Value $lines -Encoding utf8
Write-Host "Informe PREVIEW: $reportFull"
if(-not $Apply){if($conflicts.Count){Write-Warning "$($conflicts.Count) conflicto(s). -Apply se detendría."};return}
if($conflicts.Count){throw "Se detectaron $($conflicts.Count) incompatibilidades. No se realizó ninguna escritura."}

foreach($listName in $schema.Keys){$spec=$schema[$listName];$list=Get-PnPList -Identity $listName -ErrorAction SilentlyContinue;if(-not$list){New-PnPList -Title $listName -Template $spec.Template -OnQuickLaunch:$false|Out-Null};foreach($fieldSpec in $spec.Fields){if(-not(Get-PnPField -List $listName -Identity $fieldSpec.Name -ErrorAction SilentlyContinue)){if($fieldSpec.Type-eq'Choice'){Add-PnPField -List $listName -DisplayName $fieldSpec.Name -InternalName $fieldSpec.Name -Type Choice -Choices $fieldSpec.Choices -Required:$fieldSpec.Required -AddToDefaultView:$fieldSpec.View|Out-Null}else{Add-PnPField -List $listName -DisplayName $fieldSpec.Name -InternalName $fieldSpec.Name -Type $fieldSpec.Type -Required:$fieldSpec.Required -AddToDefaultView:$fieldSpec.View|Out-Null};if($fieldSpec.Indexed-or$fieldSpec.Unique){Set-PnPField -List $listName -Identity $fieldSpec.Name -Values @{Indexed=$fieldSpec.Indexed;EnforceUniqueValues=$fieldSpec.Unique}|Out-Null}}}}
Set-PnPList -Identity SWC12_Documentos -EnableVersioning $false -EnableMinorVersions $false
foreach($name in $sensitive){Set-PnPList -Identity $name -BreakRoleInheritance;Set-PnPListPermission -Identity $name -User $service -AddRole $RoleName;foreach($admin in $AdminEmails){Set-PnPListPermission -Identity $name -User $admin -AddRole $RoleName}}
foreach($view in Get-PnPView -List SWC12_Credenciales){if(@($view.ViewFields)-contains'TokenValue'){Set-PnPView -List SWC12_Credenciales -Identity $view.Id -Fields @($view.ViewFields|Where-Object{$_-ne'TokenValue'})|Out-Null}}
$permissionRows.Clear();foreach($name in $sensitive){Get-Permissions $name};$unexpected=@($permissionRows|Where-Object{-not $_.Authorized -and ($_.CanRead -or $_.CanWrite -or $_.FullControl)});if($unexpected.Count){throw "POST-VALIDATION: existen principales no autorizados: $($unexpected.Principal-join ', ')"}
Write-Host 'Aprovisionamiento V1.2 TEST aplicado y permisos efectivos verificados.'
