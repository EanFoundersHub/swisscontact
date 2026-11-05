param(
  [Parameter(Mandatory=$true)][string]$SiteUrl,
  [Parameter(Mandatory=$true)][ValidateSet('Create','Renew','Revoke')][string]$Action,
  [Parameter(Mandatory=$true)][string]$MentorId,
  [int]$ValidDays=30,
  [switch]$Apply
)
$ErrorActionPreference='Stop'
if($SiteUrl -notmatch '/sites/SWC-Mentorias-TEST/?$'){throw 'Las credenciales V1.2 solo se administran en SWC-Mentorias-TEST.'}
if($ValidDays -lt 1 -or $ValidDays -gt 365){throw 'ValidDays debe estar entre 1 y 365.'}
if(-not $Apply){Write-Host "DRY RUN: $Action para $MentorId en TEST. No se generó ni almacenó token.";exit 0}
Connect-PnPOnline -Url $SiteUrl -Interactive
$now=(Get-Date).ToUniversalTime();$rows=Get-PnPListItem -List SWC12_Credenciales -Query "<View><Query><Where><And><Eq><FieldRef Name='MentorId'/><Value Type='Text'>$MentorId</Value></Eq><Eq><FieldRef Name='Activa'/><Value Type='Boolean'>1</Value></Eq></And></Where></Query></View>"
if($Action -eq 'Revoke'){$rows|ForEach-Object{Set-PnPListItem -List SWC12_Credenciales -Identity $_.Id -Values @{Activa=$false;RevocadaEn=$now}|Out-Null};Write-Host "Credenciales activas revocadas para $MentorId. No se eliminó historial.";exit 0}
if($Action -eq 'Renew'){$rows|ForEach-Object{Set-PnPListItem -List SWC12_Credenciales -Identity $_.Id -Values @{Activa=$false;RevocadaEn=$now}|Out-Null}}
$bytes=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Fill($bytes);$token=[Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_');if($token.Length-ne 43){throw 'Token CSPRNG inválido.'}
$credentialId=[guid]::NewGuid().ToString();$version=if($rows){1+($rows|ForEach-Object{[int]$_['Version']}|Measure-Object -Maximum).Maximum}else{1}
Add-PnPListItem -List SWC12_Credenciales -Values @{Title=$credentialId;CredentialId=$credentialId;MentorId=$MentorId;TokenValue=$token;ValidaDesde=$now;ExpiraEn=$now.AddDays($ValidDays);Activa=$true;Version=$version}|Out-Null
Set-Clipboard -Value $token
Write-Host "Credencial $credentialId creada para $MentorId; vence $($now.AddDays($ValidDays).ToString('u')). El token se copió al portapapeles y no se imprimió."
