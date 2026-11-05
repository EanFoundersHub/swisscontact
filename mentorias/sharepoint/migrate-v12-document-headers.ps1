param(
  [Parameter(Mandatory=$true)][uri]$SiteUrl,
  [string]$ReportPath=(Join-Path $PSScriptRoot '..\docs\V12-DOCUMENT-MIGRATION-PREVIEW.md'),
  [switch]$Apply
)
$ErrorActionPreference='Stop'
if($SiteUrl.Scheme-ne'https' -or $SiteUrl.DnsSafeHost-ne'universidadeaneduco.sharepoint.com' -or $SiteUrl.AbsolutePath.TrimEnd('/')-cne'/sites/SWC-Mentorias-TEST'){throw 'La migración solo admite https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST'}
if(-not(Get-Module -ListAvailable PnP.PowerShell)){throw 'Instale PnP.PowerShell.'}
Connect-PnPOnline -Url $SiteUrl.AbsoluteUri -Interactive
$web=Get-PnPWeb;if(([uri]$web.Url).DnsSafeHost-ne'universidadeaneduco.sharepoint.com' -or ([uri]$web.Url).AbsolutePath.TrimEnd('/')-cne'/sites/SWC-Mentorias-TEST'){throw "Sitio resuelto no autorizado: $($web.Url)"}
if(-not(Get-PnPList -Identity SWC12_DocumentosCabecera -ErrorAction SilentlyContinue)){throw 'Falta SWC12_DocumentosCabecera. Ejecute primero el aprovisionamiento V1.2 actualizado.'}
$headers=@(Get-PnPListItem -List SWC12_DocumentosCabecera -PageSize 500 -Fields DocumentoId,EmpresaId,VersionActual,ItemVigenteId,Estado)
$files=@(Get-PnPListItem -List SWC12_Documentos -PageSize 500 -Fields ID,DocumentoId,EmpresaId,VersionDocumento,EsVigente,Created)
$rows=[Collections.Generic.List[object]]::new();$conflicts=[Collections.Generic.List[string]]::new();$toCreate=[Collections.Generic.List[object]]::new()
foreach($group in @($files|Where-Object{-not[string]::IsNullOrWhiteSpace($_['DocumentoId'])}|Group-Object{$_.FieldValues['DocumentoId']})){
 $docId=$group.Name;$versions=@($group.Group|Sort-Object @{Expression={if($_['VersionDocumento']){[int]$_['VersionDocumento']}else{1}}},@{Expression={$_.Id}} -Descending);$companyIds=@($group.Group|ForEach-Object{$_.FieldValues['EmpresaId']}|Select-Object -Unique)
 if($companyIds.Count-ne1){$conflicts.Add("$docId aparece en empresas distintas: $($companyIds-join ', ')");continue}
 $currentCandidates=@($versions|Where-Object{$_.FieldValues['EsVigente']-eq$true});if($currentCandidates.Count-gt1){$conflicts.Add("$docId tiene varias versiones marcadas vigentes.");continue};$current=if($currentCandidates.Count-eq1){$currentCandidates[0]}else{$versions[0]};$version=if($current['VersionDocumento']){[int]$current['VersionDocumento']}else{1}
 $existing=@($headers|Where-Object{$_.FieldValues['DocumentoId']-eq$docId});if($existing.Count){if($existing.Count-ne1 -or $existing[0].FieldValues['EmpresaId']-ne$companyIds[0]){$conflicts.Add("Cabecera incompatible para $docId")};$rows.Add([pscustomobject]@{DocumentoId=$docId;EmpresaId=$companyIds[0];Version=$version;ItemId=$current.Id;Accion='EXISTENTE'});continue}
 $candidate=[pscustomobject]@{DocumentoId=$docId;EmpresaId=$companyIds[0];Version=$version;ItemId=$current.Id;Accion='CREAR CABECERA'};$toCreate.Add($candidate);$rows.Add($candidate)
}
$withoutId=@($files|Where-Object{[string]::IsNullOrWhiteSpace($_['DocumentoId'])});if($withoutId.Count){$conflicts.Add("$($withoutId.Count) archivo(s) legado(s) no tienen DocumentoId; requieren clasificación manual, sin modificar el binario.")}
$lines=@('# Migración de cabeceras documentales V1.2','',"- Sitio: $($web.Url)","- Modo: $(if($Apply){'APPLY'}else{'PREVIEW'})","- Cabeceras nuevas: $($toCreate.Count)","- Conflictos: $($conflicts.Count)",'','| DocumentoID | EmpresaID | Versión | Item vigente | Acción |','|---|---|---:|---:|---|')+@($rows|ForEach-Object{"| $($_.DocumentoId) | $($_.EmpresaId) | $($_.Version) | $($_.ItemId) | $($_.Accion) |"})+@('','## Conflictos')+$(if($conflicts.Count){@($conflicts|ForEach-Object{"- $_"})}else{'- Ninguno'})
$full=[IO.Path]::GetFullPath($ReportPath);$parent=Split-Path -Parent $full;if(-not(Test-Path -LiteralPath $parent)){New-Item -ItemType Directory -Path $parent|Out-Null};Set-Content -LiteralPath $full -Value $lines -Encoding utf8;Write-Host "Informe: $full"
if(-not$Apply){return};if($conflicts.Count){throw 'Migración detenida por conflictos; no se creó ninguna cabecera.'}
foreach($row in $toCreate){Add-PnPListItem -List SWC12_DocumentosCabecera -Values @{Title=$row.DocumentoId;DocumentoId=$row.DocumentoId;EmpresaId=$row.EmpresaId;VersionActual=$row.Version;ItemVigenteId=$row.ItemId;Estado='Activo'}|Out-Null}
Write-Host "Cabeceras creadas: $($toCreate.Count). Ningún archivo fue modificado."
