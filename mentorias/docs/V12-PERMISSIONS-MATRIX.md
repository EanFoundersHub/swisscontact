# Matriz de auditoría de permisos V1.2

| Recurso | Cuenta de servicio autorizada | Administrador humano autorizado | Estado esperado |
|---|---|---|---|
| SWC12_Credenciales | foundershub@universidadean.edu.co | afcaballero@universidadean.edu.co | Herencia rota; ninguna otra lectura/escritura |
| SWC12_Operaciones | foundershub@universidadean.edu.co | afcaballero@universidadean.edu.co | Herencia rota; ninguna otra lectura/escritura |
| SWC12_Accesos | foundershub@universidadean.edu.co | afcaballero@universidadean.edu.co | Herencia rota; ninguna otra lectura/escritura |

El PREVIEW enumera para cada asignación: nombre visible, LoginName, correo resuelto, tipo de principal, origen directo/heredado, roles, Full Control, lectura, escritura y condición autorizada.

Tipos identificables:

- Usuario.
- Grupo SharePoint.
- Grupo Microsoft Entra o de seguridad.
- Grupo de distribución.
- Otros tipos devueltos por SharePoint.

Los claims se normalizan extrayendo una dirección completa y canónica. Nunca se autoriza por coincidencia parcial. Un principal sin correo verificable puede inventariarse, pero no se considera autorizado. Si un principal presenta correos distintos, el script detiene la auditoría por ambigüedad.

La cuenta Founders Hub es una cuenta de servicio. `afcaballero@universidadean.edu.co` es el único administrador humano declarado. El script rechaza cuentas adicionales y también rechaza que una misma dirección ocupe ambos roles.

El informe live no consulta elementos de la lista de credenciales ni exporta valores. El campo sensible aparece redactado en la matriz de columnas. El riesgo residual es el almacenamiento en texto: cualquier principal con permisos efectivos de lectura podría recuperar credenciales fuera de este script.
