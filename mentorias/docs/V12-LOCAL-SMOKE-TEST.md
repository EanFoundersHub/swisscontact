# Ejecutor local de la primera prueba real V1.2

El ejecutor usa los esquemas de los paquetes locales `SWC-MENTORIAS-V12-TEST` y `SWC-ADMIN-V12-TEST`. No acepta URL ni token mediante parámetros. Ambos se solicitan con entrada segura y solo existen en memoria durante la ejecución.

## Requisitos

- PowerShell 7 (`pwsh`).
- URL firmada del flujo importado `SWC-MENTORIAS-V12-TEST`.
- Power Automate Flow ID conservado como referencia: `4b93e1a2-c00d-4349-8829-02dcd2b2f87e`.
- Trigger Workflow ID usado para validar la URL firmada: `48fa0ce604114962b3daa5dac9433b22`.
- Token ficticio de Mentor A.
- EmpresaID ficticios de Alfa (asignada) y Beta (no asignada).

## Ejecución única

Desde la terminal institucional:

```powershell
cd C:\Users\afcaballero\Downloads\Swisscontact\mentoria-v1\mentorias
pwsh -NoProfile -File .\tests\e2e\run-v12-smoke-test.ps1
```

El orden es obligatorio:

1. credencial aleatoria inválida → `401 CREDENCIAL_INVALIDA`;
2. Mentor A lista empresas → Alfa presente y Beta ausente;
3. Mentor A solicita Beta → `403 EMPRESA_NO_ASIGNADA`;
4. solamente después de lo anterior, confirmación manual y creación de una bitácora ficticia de 60 minutos;
5. recuperación de la misma bitácora mediante `consultarBitacora`.

Ante cualquier resultado de autorización inesperado, el script lanza un error, no ejecuta la escritura y genera el informe parcial. Los informes se guardan en `reports/e2e/` y no contienen URL firmada, token ni cuerpos completos.

Para validar solamente los contratos locales, sin red ni secretos:

```powershell
pwsh -NoProfile -File .\tests\e2e\run-v12-smoke-test.ps1 -ValidateContractOnly
```

La URL se admite únicamente si usa HTTPS, pertenece a un host de Power Automate, contiene una firma, tiene una ruta de trigger manual y el identificador incluido en `/workflows/{id}/triggers/manual/` coincide exactamente con el Trigger Workflow ID `48fa0ce604114962b3daa5dac9433b22`. El Power Automate Flow ID no se usa para validar esa ruta. La comparación ocurre antes de crear el cliente HTTP o realizar solicitudes.
