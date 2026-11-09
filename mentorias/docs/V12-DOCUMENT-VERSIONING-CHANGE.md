# Informe de corrección del versionado lógico

## Cambios

- DocumentoId estable mediante `SWC12_DocumentosCabecera`.
- Incremento de VersionActual protegido por ETag/IF-MATCH.
- Un CreateFile por revisión, sin sobrescritura.
- Metadatos de linaje, carga, autor, vigencia e idempotencia.
- Descarga de la versión vigente determinada por ItemVigenteId.
- Historial completo en consultas mentor y administrador.
- Repetición confirmada devuelve ResultadoJson; una operación no confirmada no vuelve a escribir con la misma clave.
- Colisión concurrente conserva el candidato como Conflicto, sin promoverlo.
- Migración no destructiva de documentos existentes mediante creación de cabeceras.

## Recursos afectados

- SWC-MENTORIAS-V12-TEST: carga inicial, nueva versión, consulta y descarga.
- SWC-ADMIN-V12-TEST: consulta normalizada y descarga vigente.
- Frontend: muestra Vigente/Histórica y permite enviar una revisión con DocumentoId estable.
- Aprovisionamiento: nueva lista de cabeceras y nuevos campos documentales.

Los ZIP V1.2 fueron reconstruidos como paquetes TEST independientes. No fueron importados ni habilitados.

## SHA-256

- `SWC-MENTORIAS-V12-TEST.zip`: `06F5D8EFF38012AE403A7995DE31B1701447E958A63D250A005B24F50FABB9D8`
- `SWC-ADMIN-V12-TEST.zip`: `1D3BDF49C9F9866C65EC8A9F449A689CE952D6440252E6992D3458EAB1FDB830`
