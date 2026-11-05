# PREVIEW autenticado V1.2

Base: `c128b53`. Destino único: `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST`.

El script valida el URI antes de conectar y valida nuevamente la URL resuelta por SharePoint. Rechaza cualquier dominio, esquema, ruta, query o fragmento diferente.

Sin `-Apply` realiza exclusivamente:

- conexión interactiva mediante una aplicación Entra institucional indicada con ClientId;
- inventario de listas y biblioteca;
- comparación de plantilla, tipo, obligatoriedad, índice, unicidad y opciones Choice;
- lectura de vistas, sin leer elementos o valores de credenciales;
- enumeración de asignaciones de roles de las tres listas sensibles;
- clasificación de usuario, grupo SharePoint, grupo Entra/seguridad y grupo de distribución;
- cálculo de Full Control, lectura y escritura a partir de BasePermissions;
- generación de un informe Markdown local.

El informe redacta el nombre del campo sensible y nunca contiene valores de credenciales. No se usa coincidencia parcial de correos, no se limpia ningún subámbito y no se ejecuta migración documental.

El PREVIEW live no fue ejecutado en esta preparación: requiere inicio de sesión institucional y el ClientId real de la aplicación Entra autorizada para PnP.PowerShell.
