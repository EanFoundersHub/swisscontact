# Integración GitHub Pages — Swisscontact

## Estructura

```text
/
├── index.html                         Dashboard MEL original
├── Dashboard_Seguimiento_MEL_...html Copia original del Dashboard MEL
└── mentorias/
    ├── index.html                     Portal mentorías
    ├── styles.css
    ├── app.js
    ├── config.js
    ├── msal.config.example.js
    ├── auth-msal.js
    ├── src/
    ├── tests/
    ├── oauth-test/
    ├── power-automate/
    ├── sharepoint/
    └── docs/
```

Rutas previstas:

- Dashboard MEL: `https://eanfoundershub.github.io/swisscontact/`
- Mentorías: `https://eanfoundershub.github.io/swisscontact/mentorias/`

## Aislamiento

El portal utiliza exclusivamente rutas relativas dentro de `/mentorias/`. El Dashboard raíz no carga archivos del portal y el portal no importa código del Dashboard.

Las vistas de mentor y administrador siguen siendo secciones distintas (`#mentorView` y `#adminView`) dentro del módulo de mentorías. El backend continúa siendo responsable de decidir qué perfil y empresas puede consultar cada identidad.

## MSAL

`msal.config.example.js` fija únicamente las redirect URI públicas. `tenantId`, `clientId` y `flowScopes` permanecen como marcadores. `msal.config.js` está ignorado por Git para evitar configuraciones personales; los identificadores públicos institucionales podrán publicarse después de su aprobación, pero nunca secretos.

## Verificación

Desde `/mentorias/`:

```powershell
npm test
```

Las pruebas verifican el hash exacto del Dashboard, resolución de recursos relativos, separación de perfiles y redirect URI.

No se realizó publicación ni push.
