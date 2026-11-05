# Cambios y reversión — Fase 1 V1.1

## Cambios

- Inicialización Git y commit base del estado recibido.
- Rama `feature/mentorias-v1-1`.
- Sonda aislada OAuth/CORS sin persistencia de token.
- Configuración MSAL de ejemplo y módulo todavía no conectado.
- Informe de identidad y viabilidad.

No se modificaron los paquetes Power Automate recibidos, el frontend activo, SharePoint ni el diagnóstico.

## Reversión

Para descartar los artefactos V1.1 sin tocar el baseline:

```powershell
git switch main
```

No ejecutar `git reset --hard` mientras existan cambios locales no respaldados. La rama `main` conserva el commit base `f8d34df`.
