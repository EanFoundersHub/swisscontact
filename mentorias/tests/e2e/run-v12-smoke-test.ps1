[CmdletBinding()]
param(
  [string]$ReportDirectory = (Join-Path $PSScriptRoot '..\..\reports\e2e'),
  [switch]$ValidateContractOnly
)

$ErrorActionPreference = 'Stop'
$mentorFlowName = 'SWC-MENTORIAS-V12-TEST'
$adminFlowName = 'SWC-ADMIN-V12-TEST'
$expectedWorkflowId = '4b93e1a2-c00d-4349-8829-02dcd2b2f87e'
$testSite = 'https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST'
$results = [Collections.Generic.List[object]]::new()
$createdBitacoraId = ''
$signedUrl = $null
$accessToken = $null
$client = $null

function Get-FlowDefinition([string]$FlowName) {
  $root = Join-Path $PSScriptRoot "..\..\dist\power-automate-v12\$FlowName\Microsoft.Flow\flows"
  $manifestPath = Join-Path $root 'manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) { throw "No se encontró el manifiesto local de $FlowName." }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $definitionPath = Join-Path $root "$($manifest.flowAssets.assetPaths[0])\definition.json"
  return Get-Content -LiteralPath $definitionPath -Raw | ConvertFrom-Json -Depth 100
}

function Assert-Contract {
  if ($expectedWorkflowId -cnotmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') { throw 'El Workflow ID obligatorio configurado no es un GUID canónico.' }
  $mentor = Get-FlowDefinition $mentorFlowName
  $admin = Get-FlowDefinition $adminFlowName
  foreach ($entry in @(@{Name=$mentorFlowName;Definition=$mentor},@{Name=$adminFlowName;Definition=$admin})) {
    $parameters = $entry.Definition.properties.definition.parameters
    if ($parameters.SiteUrl.defaultValue -cne $testSite -or $parameters.DiagnosticoSiteUrl.defaultValue -cne $testSite) { throw "$($entry.Name) no está dirigido exclusivamente a TEST." }
    if (($entry.Definition | ConvertTo-Json -Depth 100 -Compress).IndexOf('TENANT') -ge 0) { throw "$($entry.Name) conserva un marcador TENANT." }
  }
  $schema = $mentor.properties.definition.triggers.manual.inputs.schema
  $operations = @($schema.properties.operation.enum)
  foreach ($operation in @('consultarEmpresasDisponibles','consultarExpediente','crearBitacora','consultarBitacora')) {
    if ($operation -cnotin $operations) { throw "El contrato real no contiene $operation." }
  }
  $expectedFields = [ordered]@{operation='string';accessToken='string';empresaId='string';bitacoraId='string';idempotencyKey='string';contenidoHash='string';fechaSesion='string';duracionMinutos='integer';actividad='string';acompanamiento='string';avances='string';compromisos='string';observaciones='string'}
  foreach ($field in $expectedFields.Keys) {
    $actual = $schema.properties.$field.type
    if ($actual -cne $expectedFields[$field]) { throw "Contrato inesperado para ${field}: $actual" }
  }
  if (@($schema.required) -notcontains 'operation' -or @($schema.required) -notcontains 'accessToken') { throw 'El contrato del disparador no exige operation/accessToken.' }
}

function Read-Secret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  if ($secure.Length -eq 0) { throw 'Se recibió un valor secreto vacío.' }
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secure.Dispose() }
}

function Get-WorkflowIdentity([string]$Value) {
  try { $uri = [uri]$Value } catch { throw 'La URL firmada no es una URI válida.' }
  if ($uri.Scheme -cne 'https' -or -not [string]::IsNullOrEmpty($uri.UserInfo) -or -not [string]::IsNullOrEmpty($uri.Fragment)) { throw 'La URL firmada debe usar HTTPS y no incluir usuario ni fragmento.' }
  $host = $uri.DnsSafeHost.ToLowerInvariant()
  $allowedHost = $host.EndsWith('.logic.azure.com') -or $host.EndsWith('.environment.api.powerplatform.com') -or $host.EndsWith('.api.powerplatform.com') -or $host.EndsWith('.powerautomate.com')
  if (-not $allowedHost) { throw 'El host no pertenece a un endpoint admitido de Power Automate.' }
  $match = [regex]::Match($uri.AbsolutePath,'(?i)/(?:automations/direct/)?workflows/([0-9a-f-]{32,36})/triggers/manual/paths/invoke')
  if (-not $match.Success) { throw 'La ruta no corresponde a un disparador manual de Power Automate.' }
  if ([string]::IsNullOrWhiteSpace($uri.Query) -or ($uri.Query -notmatch '(?i)(?:sig|signature)=')) { throw 'La URL no contiene una firma de invocación.' }
  return [pscustomobject]@{Uri=$uri;Host=$host;WorkflowId=$match.Groups[1].Value.ToLowerInvariant()}
}

function New-RandomBearer {
  $bytes = [byte[]]::new(32); $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Get-Sha256([string]$Value) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Value)))).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Invoke-Flow([hashtable]$Payload) {
  $json = $Payload | ConvertTo-Json -Depth 20 -Compress
  $content = [Net.Http.StringContent]::new($json,[Text.Encoding]::UTF8,'application/json')
  $response = $null
  try {
    $response = $client.PostAsync($signedUrl,$content).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $parsed = $null; if (-not [string]::IsNullOrWhiteSpace($text)) { try { $parsed = $text | ConvertFrom-Json -Depth 100 } catch {} }
    $headerId = ''
    foreach ($header in @('x-ms-workflow-run-id','x-ms-request-id','x-ms-correlation-request-id')) {
      $values = $null
      if ($response.Headers.TryGetValues($header,[ref]$values)) { $headerId = (@($values)[0]); break }
    }
    $metaId = if ($parsed -and $parsed.meta -and $parsed.meta.requestId) { [string]$parsed.meta.requestId } else { '' }
    return [pscustomobject]@{Status=[int]$response.StatusCode;Json=$parsed;RequestId=$(if($metaId){$metaId}else{$headerId})}
  } catch {
    return [pscustomobject]@{Status=0;Json=$null;RequestId='';TransportError=$_.Exception.GetType().Name}
  } finally {
    if ($response) { $response.Dispose() }; $content.Dispose(); $json = $null
  }
}

function Add-Result([string]$Test,[string]$Expected,$Response,[string]$Outcome,[string]$SafeDetail='') {
  $code = if ($Response.Json -and $Response.Json.error) { [string]$Response.Json.error.code } else { '' }
  $results.Add([pscustomobject]@{Test=$Test;Expected=$Expected;Http=$Response.Status;Code=$code;Outcome=$Outcome;RequestId=$Response.RequestId;Detail=$SafeDetail})
}

function Write-Report {
  $full = [IO.Path]::GetFullPath($ReportDirectory)
  if (-not (Test-Path -LiteralPath $full)) { New-Item -ItemType Directory -Path $full | Out-Null }
  $path = Join-Path $full ("V12-SMOKE-{0}.md" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
  $lines = @('# Swisscontact Mentorías V1.2 — prueba real controlada','',"- Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')","- Flujo esperado: $mentorFlowName","- Sitio contractual: $testSite",'- Secretos almacenados: no','- Escritura habilitada únicamente después de aprobar autorización positiva y negativa.','','| Prueba | Esperado | HTTP | Código | Resultado | Request/Run ID | Detalle seguro |','|---|---|---:|---|---|---|---|')
  $lines += @($results | ForEach-Object { "| $($_.Test) | $($_.Expected) | $($_.Http) | $($_.Code) | $($_.Outcome) | $($_.RequestId) | $($_.Detail) |" })
  if ($createdBitacoraId) { $lines += @('',("- Bitácora ficticia creada y recuperada: {0}" -f $createdBitacoraId)) }
  $lines += @('','> El informe no contiene URL firmada, token ni cuerpos completos de solicitud/respuesta.')
  Set-Content -LiteralPath $path -Value $lines -Encoding utf8
  Write-Host "Informe seguro: $path"
}

Assert-Contract
if ($ValidateContractOnly) { Write-Host 'Contrato local V1.2 válido para las cinco pruebas.'; return }

try {
  $signedUrl = Read-Secret 'Pegue la URL firmada de SWC-MENTORIAS-V12-TEST'
  $identity = Get-WorkflowIdentity $signedUrl
  if ($expectedWorkflowId -cne $identity.WorkflowId) { throw 'El Workflow ID de la URL no coincide exactamente con el flujo TEST confirmado.' }
  Write-Host "Destino validado: $($identity.Host) / workflow $($identity.WorkflowId) (firma oculta)"
  $client = [Net.Http.HttpClient]::new(); $client.Timeout = [TimeSpan]::FromSeconds(60)

  $invalid = Invoke-Flow @{operation='consultarEmpresasDisponibles';accessToken=(New-RandomBearer)}
  $invalidCode = if ($invalid.Json -and $invalid.Json.error) { [string]$invalid.Json.error.code } else { '' }
  if ($invalid.Status -ne 401 -or $invalidCode -cne 'CREDENCIAL_INVALIDA') { Add-Result 'T1 credencial inválida' '401 CREDENCIAL_INVALIDA' $invalid 'FALLO/ABORTADO'; throw 'La credencial inválida no fue rechazada como exige el contrato.' }
  Add-Result 'T1 credencial inválida' '401 CREDENCIAL_INVALIDA' $invalid 'APROBADA'

  $accessToken = Read-Secret 'Pegue el token ficticio de Mentor A'
  if ($accessToken.Length -ne 43 -or $accessToken -match "['\s]") { throw 'El token no cumple el formato de 43 caracteres del flujo.' }
  $alfaId = (Read-Host 'EmpresaID ficticio de Alfa (asignada a Mentor A)').Trim()
  $betaId = (Read-Host 'EmpresaID ficticio de Beta (NO asignada a Mentor A)').Trim()
  foreach ($id in @($alfaId,$betaId)) { if ($id -notmatch '^[A-Za-z0-9._-]{1,100}$') { throw 'EmpresaID ficticio inválido.' } }
  if ($alfaId -ceq $betaId) { throw 'Alfa y Beta deben tener EmpresaID distintos.' }

  $companies = Invoke-Flow @{operation='consultarEmpresasDisponibles';accessToken=$accessToken}
  $listed = @($companies.Json.data.empresas | ForEach-Object { [string]$_.empresaId })
  if ($companies.Status -ne 200 -or -not $companies.Json.ok -or $alfaId -cnotin $listed -or $betaId -cin $listed) { Add-Result 'T2 Mentor A → Alfa' '200; Alfa visible; Beta ausente' $companies 'FALLO/ABORTADO'; throw 'La lista de empresas no demuestra la asignación esperada.' }
  Add-Result 'T2 Mentor A → Alfa' '200; Alfa visible; Beta ausente' $companies 'APROBADA' "empresas autorizadas=$($listed.Count)"

  $cross = Invoke-Flow @{operation='consultarExpediente';accessToken=$accessToken;empresaId=$betaId}
  $crossCode = if ($cross.Json -and $cross.Json.error) { [string]$cross.Json.error.code } else { '' }
  if ($cross.Status -ne 403 -or $crossCode -cne 'EMPRESA_NO_ASIGNADA') { Add-Result 'T3 Mentor A → Beta' '403 EMPRESA_NO_ASIGNADA' $cross 'FALLO/ABORTADO'; throw 'La prueba de acceso cruzado produjo una respuesta inesperada. Se bloquean escrituras.' }
  Add-Result 'T3 Mentor A → Beta' '403 EMPRESA_NO_ASIGNADA' $cross 'APROBADA'

  $confirmation = Read-Host 'Autorización superada. Escriba CREAR-BITACORA-TEST para crear una sesión ficticia de 60 minutos'
  if ($confirmation -cne 'CREAR-BITACORA-TEST') { throw 'Prueba de escritura cancelada por el operador.' }
  $idempotencyKey = [guid]::NewGuid().ToString()
  $safeContent = [ordered]@{empresaId=$alfaId;fechaSesion=(Get-Date -Format 'yyyy-MM-dd');duracionMinutos=60;actividad='Prueba técnica V1.2';acompanamiento='Validación controlada del flujo TEST';avances='Prueba técnica';compromisos='Sin compromisos reales';observaciones='Dato ficticio para E2E'}
  $createPayload = @{operation='crearBitacora';accessToken=$accessToken;empresaId=$alfaId;idempotencyKey=$idempotencyKey;contenidoHash=(Get-Sha256 ($safeContent|ConvertTo-Json -Compress));fechaSesion=$safeContent.fechaSesion;duracionMinutos=60;actividad=$safeContent.actividad;acompanamiento=$safeContent.acompanamiento;avances=$safeContent.avances;compromisos=$safeContent.compromisos;observaciones=$safeContent.observaciones}
  $created = Invoke-Flow $createPayload
  $createdBitacoraId = if ($created.Json -and $created.Json.data) { [string]$created.Json.data.bitacoraId } else { '' }
  if ($created.Status -ne 200 -or -not $created.Json.ok -or [string]::IsNullOrWhiteSpace($createdBitacoraId)) { Add-Result 'T4 crear bitácora 60 min' '200 + BitacoraID' $created 'FALLO'; throw 'No se confirmó la creación de la bitácora ficticia.' }
  Add-Result 'T4 crear bitácora 60 min' '200 + BitacoraID' $created 'APROBADA' "BitacoraID=$createdBitacoraId"

  $read = Invoke-Flow @{operation='consultarBitacora';accessToken=$accessToken;empresaId=$alfaId;bitacoraId=$createdBitacoraId}
  $versions = @($read.Json.data.versiones)
  $matching = @($versions | Where-Object { [string]$_.BitacoraId -ceq $createdBitacoraId -and [int]$_.DuracionMinutos -eq 60 })
  if ($read.Status -ne 200 -or -not $read.Json.ok -or [string]$read.Json.data.cabecera.BitacoraId -cne $createdBitacoraId -or $matching.Count -lt 1) { Add-Result 'T5 recuperar bitácora' '200; cabecera y revisión de 60 min' $read 'FALLO'; throw 'La bitácora creada no pudo recuperarse con el contrato esperado.' }
  Add-Result 'T5 recuperar bitácora' '200; cabecera y revisión de 60 min' $read 'APROBADA' "revisiones=$($versions.Count)"
  Write-Host 'Cinco pruebas aprobadas. La escritura se limitó a una bitácora ficticia de 60 minutos.'
} finally {
  Write-Report
  if ($client) { $client.Dispose() }
  $signedUrl = $null; $accessToken = $null
}
