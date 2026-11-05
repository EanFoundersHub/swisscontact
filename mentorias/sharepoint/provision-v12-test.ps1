param(
  [Parameter(Mandatory=$true)][uri]$SiteUrl,
  [Parameter(Mandatory=$true)][string]$ServiceAccountEmail,
  [Parameter(Mandatory=$true)][string[]]$AdminEmails,
  [string]$RoleName='Full Control',
  [string]$ReportPath=(Join-Path $PSScriptRoot '..\docs\V12-PREVIEW-LIVE.md'),
  [switch]$Apply
)
$ErrorActionPreference='Stop'
$expectedHost='universidadeaneduco.sharepoint.com'
$expectedPath='/sites/SWC-Mentorias-TEST'
if($SiteUrl.Scheme -ne 'https' -or $SiteUrl.DnsSafeHost -ne $expectedHost -or $SiteUrl.AbsolutePath.TrimEnd('/') -cne $expectedPath){throw "Destino rechazado. Debe ser exactamente https://$expectedHost$expectedPath"}
if(-not (Get-Module -ListAvailable PnP.PowerShell)){throw 'Instale PnP.PowerShell.'}
if([string]::IsNullOrWhiteSpace($ServiceAccountEmail)){throw 'ServiceAccountEmail es obligatorio.'}
$AdminEmails=@($AdminEmails|ForEach-Object{$_.Trim().ToLowerInvariant()}|Where-Object{$_}|Select-Object -Unique)
if($AdminEmails.Count -eq 0){throw 'AdminEmails debe identificar explícitamente al menos un administrador.'}

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
 SWC12_Documentos=@{Template='DocumentLibrary';Fields=@(F EmpresaId Text;F BitacoraId Text;F DocumentoId Text;F IdempotencyKey Text $false $true $true;F ContenidoHash Text;F MentorId Text;F NombreArchivo Text;F VersionDocumento Number;F Tipo Choice $true $false $false $true @('PlanAccion','Transcripcion','Documento','Etapa0');F UrlDescarga URL $true)}
}
$sensitive=@('SWC12_Credenciales','SWC12_Operaciones','SWC12_Accesos')
$rows=[Collections.Generic.List[object]]::new();$permissionRows=[Collections.Generic.List[object]]::new();$conflicts=[Collections.Generic.List[string]]::new();$planned=[Collections.Generic.List[string]]::new()
function Add-Row($list,$field,$status,$detail){$rows.Add([pscustomobject]@{List=$list;Field=$field;Status=$status;Detail=$detail})}
function Type-Ok($expected,$actual){$actual -eq $expected -or ($expected -eq 'URL' -and $actual -eq 'URL')}
function Test-AllowedPrincipal([string]$login){$value=$login.ToLowerInvariant();return @($allowed|Where-Object{$value.Contains($_)}).Count -gt 0}
function Get-Permissions($list){
 $ctx=Get-PnPContext;$obj=Get-PnPList -Identity $list -Includes HasUniqueRoleAssignments,RoleAssignments
 $ctx.Load($obj.RoleAssignments);$ctx.ExecuteQuery()
 foreach($ra in $obj.RoleAssignments){$ctx.Load($ra.Member);$ctx.Load($ra.RoleDefinitionBindings);$ctx.ExecuteQuery();$permissionRows.Add([pscustomobject]@{List=$list;Principal=$ra.Member.LoginName;Roles=(@($ra.RoleDefinitionBindings|ForEach-Object Name)-join ', ');Unique=$obj.HasUniqueRoleAssignments})}
}
Connect-PnPOnline -Url $SiteUrl.AbsoluteUri -Interactive
$web=Get-PnPWeb -Includes Url,CurrentUser
if(([uri]$web.Url).DnsSafeHost -ne $expectedHost -or ([uri]$web.Url).AbsolutePath.TrimEnd('/') -cne $expectedPath){throw "La conexión resolvió un sitio distinto: $($web.Url)"}
$connectedEmail=$web.CurrentUser.Email.ToLowerInvariant();$service=$ServiceAccountEmail.Trim().ToLowerInvariant();$allowed=@($service)+$AdminEmails
if($connectedEmail -notin $allowed){throw "La cuenta conectada $connectedEmail debe estar declarada como Founders Hub o administrador."}
$role=Get-PnPRoleDefinition -Identity $RoleName -ErrorAction SilentlyContinue
if(-not $role){throw "El nivel de permisos '$RoleName' no existe en este sitio."}

foreach($listName in $schema.Keys){
 $spec=$schema[$listName];$list=Get-PnPList -Identity $listName -Includes BaseTemplate,EnableVersioning,EnableMinorVersions,HasUniqueRoleAssignments -ErrorAction SilentlyContinue
 if(-not $list){Add-Row $listName '(lista)' 'NUEVO' "Crear $($spec.Template)";$planned.Add("Crear $listName ($($spec.Template))");continue}
 $expectedTemplate=if($spec.Template -eq 'DocumentLibrary'){101}else{100};if($list.BaseTemplate -ne $expectedTemplate){$msg="Tipo existente $($list.BaseTemplate), esperado $expectedTemplate";Add-Row $listName '(lista)' 'CONFLICTO' $msg;$conflicts.Add("${listName}: $msg")}else{Add-Row $listName '(lista)' 'COMPATIBLE' $spec.Template}
 if($listName -eq 'SWC12_Documentos' -and ($list.EnableVersioning -or $list.EnableMinorVersions)){$msg='Versionado nativo activo; V1.2 exige archivos append-only sin versionado nativo.';Add-Row $listName '(versionado)' 'CONFLICTO' $msg;$conflicts.Add("${listName}: $msg")}
 foreach($fieldSpec in $spec.Fields){
  $f=Get-PnPField -List $listName -Identity $fieldSpec.Name -Includes TypeAsString,Required,Indexed,EnforceUniqueValues,Choices -ErrorAction SilentlyContinue
  if(-not $f){Add-Row $listName $fieldSpec.Name 'NUEVO' "Tipo=$($fieldSpec.Type); Required=$($fieldSpec.Required); Indexed=$($fieldSpec.Indexed); Unique=$($fieldSpec.Unique)";$planned.Add("Crear columna $listName.$($fieldSpec.Name)");continue}
  $issues=@();if(-not(Type-Ok $fieldSpec.Type $f.TypeAsString)){$issues+="tipo=$($f.TypeAsString)/$($fieldSpec.Type)"};if([bool]$f.Required-ne$fieldSpec.Required){$issues+="required=$($f.Required)/$($fieldSpec.Required)"};if([bool]$f.Indexed-ne$fieldSpec.Indexed){$issues+="indexed=$($f.Indexed)/$($fieldSpec.Indexed)"};if([bool]$f.EnforceUniqueValues-ne$fieldSpec.Unique){$issues+="unique=$($f.EnforceUniqueValues)/$($fieldSpec.Unique)"};if($fieldSpec.Type-eq'Choice'){$actual=@($f.Choices|Sort-Object);$expected=@($fieldSpec.Choices|Sort-Object);if(($actual-join '|')-ne($expected-join '|')){$issues+="choices=$($actual-join ',')/$($expected-join ',')"}}
  if($issues.Count){$msg=$issues-join '; ';Add-Row $listName $fieldSpec.Name 'CONFLICTO' $msg;$conflicts.Add("$listName.$($fieldSpec.Name): $msg")}else{Add-Row $listName $fieldSpec.Name 'COMPATIBLE' 'Coincide'}
 }
 if($listName -in $sensitive){Get-Permissions $listName;if($list.HasUniqueRoleAssignments){$unexpectedExisting=@($permissionRows|Where-Object{$_.List-eq$listName -and -not(Test-AllowedPrincipal $_.Principal) -and $_.Roles-notmatch'Limited Access'});if($unexpectedExisting.Count){$conflicts.Add("$listName ya tiene permisos únicos para principales no autorizados: $($unexpectedExisting.Principal-join ', '). Revisión manual obligatoria.")}};$items=Get-PnPListItem -List $listName -PageSize 500 -Fields ID;foreach($item in $items){Get-PnPProperty -ClientObject $item -Property HasUniqueRoleAssignments|Out-Null;if($item.HasUniqueRoleAssignments){$conflicts.Add("$listName contiene subámbito único en item $($item.Id); no se aplicará ClearSubScopes.")}};$planned.Add("Romper herencia en $listName sin ClearSubScopes y conceder '$RoleName' solo a: $($allowed-join ', ')")}
}
$viewsWithToken=@();$cred=Get-PnPList -Identity SWC12_Credenciales -ErrorAction SilentlyContinue;if($cred){foreach($view in Get-PnPView -List SWC12_Credenciales){if(@($view.ViewFields)-contains'TokenValue'){$viewsWithToken+=$view.Title;$planned.Add("Retirar TokenValue de vista '$($view.Title)'")}}}

$lines=@('# PREVIEW de aprovisionamiento V1.2 TEST','',"- Fecha UTC: $(Get-Date -AsUTC -Format o)","- Sitio verificado: $($web.Url)","- Modo: $(if($Apply){'APPLY solicitado'}else{'PREVIEW solo lectura'})","- Founders Hub: $service","- Administradores explícitos: $($AdminEmails-join ', ')","- Rol verificado: $RoleName","- Conflictos: $($conflicts.Count)",'','## Compatibilidad de columnas','','| Lista | Columna/recurso | Estado | Detalle |','|---|---|---|---|')
$lines+=@($rows|ForEach-Object{"| $($_.List) | $($_.Field) | $($_.Status) | $($_.Detail -replace '\|','/') |"});$lines+=@('','## Permisos efectivos','','| Lista | Principal | Roles | Herencia rota |','|---|---|---|---|');$lines+=@($permissionRows|ForEach-Object{"| $($_.List) | $($_.Principal) | $($_.Roles) | $($_.Unique) |"});$lines+=@('','## Cambios previstos');$lines+=if($planned.Count){@($planned|ForEach-Object{"- $_"})}else{'- Ninguno'};$lines+=@('','## Seguridad de TokenValue',"- Vistas que exponen TokenValue: $(if($viewsWithToken.Count){$viewsWithToken-join ', '}else{'ninguna'})",'- Riesgo: TokenValue se almacena en texto y equivale a una credencial reutilizable; la protección depende de permisos exclusivos, Secure Inputs/Outputs, revocación y caducidad.','','## Conflictos');$lines+=if($conflicts.Count){@($conflicts|ForEach-Object{"- $_"})}else{'- Ninguno'}
$reportFull=[IO.Path]::GetFullPath($ReportPath);$parent=Split-Path -Parent $reportFull;if(-not(Test-Path -LiteralPath $parent)){New-Item -ItemType Directory -Path $parent|Out-Null};Set-Content -LiteralPath $reportFull -Value $lines -Encoding utf8
Write-Host "Informe PREVIEW: $reportFull"
if(-not $Apply){if($conflicts.Count){Write-Warning "$($conflicts.Count) conflicto(s). -Apply se detendría."};return}
if($conflicts.Count){throw "Se detectaron $($conflicts.Count) incompatibilidades. No se realizó ninguna escritura."}

foreach($listName in $schema.Keys){$spec=$schema[$listName];$list=Get-PnPList -Identity $listName -ErrorAction SilentlyContinue;if(-not$list){New-PnPList -Title $listName -Template $spec.Template -OnQuickLaunch:$false|Out-Null};foreach($fieldSpec in $spec.Fields){if(-not(Get-PnPField -List $listName -Identity $fieldSpec.Name -ErrorAction SilentlyContinue)){if($fieldSpec.Type-eq'Choice'){Add-PnPField -List $listName -DisplayName $fieldSpec.Name -InternalName $fieldSpec.Name -Type Choice -Choices $fieldSpec.Choices -Required:$fieldSpec.Required -AddToDefaultView:$fieldSpec.View|Out-Null}else{Add-PnPField -List $listName -DisplayName $fieldSpec.Name -InternalName $fieldSpec.Name -Type $fieldSpec.Type -Required:$fieldSpec.Required -AddToDefaultView:$fieldSpec.View|Out-Null};if($fieldSpec.Indexed-or$fieldSpec.Unique){Set-PnPField -List $listName -Identity $fieldSpec.Name -Values @{Indexed=$fieldSpec.Indexed;EnforceUniqueValues=$fieldSpec.Unique}|Out-Null}}}}
Set-PnPList -Identity SWC12_Documentos -EnableVersioning $false -EnableMinorVersions $false
foreach($name in $sensitive){Set-PnPList -Identity $name -BreakRoleInheritance;Set-PnPListPermission -Identity $name -User $service -AddRole $RoleName;foreach($admin in $AdminEmails){Set-PnPListPermission -Identity $name -User $admin -AddRole $RoleName}}
foreach($view in Get-PnPView -List SWC12_Credenciales){if(@($view.ViewFields)-contains'TokenValue'){Set-PnPView -List SWC12_Credenciales -Identity $view.Id -Fields @($view.ViewFields|Where-Object{$_-ne'TokenValue'})|Out-Null}}
$permissionRows.Clear();foreach($name in $sensitive){Get-Permissions $name};$unexpected=@($permissionRows|Where-Object{-not(Test-AllowedPrincipal $_.Principal) -and $_.Roles -notmatch 'Limited Access'});if($unexpected.Count){throw "POST-VALIDATION: existen principales no autorizados: $($unexpected.Principal-join ', ')"}
Write-Host 'Aprovisionamiento V1.2 TEST aplicado y permisos efectivos verificados.'
