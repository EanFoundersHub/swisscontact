# Propiedades de identidad — experimento SWC-OAUTH-IDENTITY-TEST

## Garantías conocidas antes de la prueba

| Propiedad | Origen | Garantía previa | Clasificación |
|---|---|---|---|
| Claims `aud`, `iss`, `tid`, `oid` del bearer | Token Entra ID presentado al disparador | Power Automate documenta que valida estos claims según la configuración del disparador | Autenticación del trigger; disponibilidad interna no demostrada |
| `claimedOid` del body | JavaScript/cliente | Ninguna | No confiable |
| `x-swc-authenticated-user` | JavaScript/cliente | Ninguna | No confiable |
| `x-ms-client-principal-id` | Header observado por el flujo | El nombre se usa en otros productos Microsoft, pero no hay garantía oficial encontrada para Power Automate | Candidato experimental, no confiable hasta prueba anti-suplantación |
| `x-ms-client-principal-name` | Header observado por el flujo | Igual que el anterior | Candidato experimental |
| `x-ms-user-id`, `x-ms-user-name` | Header observado por el flujo | Sin garantía oficial localizada para este trigger | Candidatos experimentales |
| `workflow().run.name` | Motor de Power Automate | Identifica la ejecución, no al usuario | Confiable solo como ID de ejecución |

## Regla de decisión

Un candidato solo puede usarse para autorización si concurren todas estas condiciones:

1. El request sin token e inválido no crea ejecución útil y es rechazado.
2. El bearer válido del único usuario permitido es aceptado.
3. El candidato coincide con el OID institucional esperado.
4. Enviar el mismo nombre de header con un OID falso no cambia el candidato observado.
5. El OID falso del body aparece únicamente como eco no confiable.
6. Existe evidencia de plataforma o repetición controlada suficiente que vincule el candidato al token validado.

Si el header falso reemplaza el supuesto header de plataforma, el candidato queda descartado inmediatamente.

## Estado

**NO EJECUTADO REMOTAMENTE.** Faltan el flujo importado en TEST, usuario autorizado, app SPA y token efímero.
