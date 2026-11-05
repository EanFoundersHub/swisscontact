# Importación y ejecución de SWC-V12-PREVIEW-TEST

## Preparación

1. Confirmar que se trabajará en el entorno Power Automate de TEST.
2. Confirmar que la conexión SharePoint seleccionada muestra `foundershub@universidadean.edu.co`.
3. No importar todavía `SWC-V12-PROVISION-TEST.zip`.

## Importar

1. En Power Automate, seleccionar **Mis flujos → Importar → Importar paquete (heredado)**.
2. Seleccionar `dist/power-automate-provision-v12/SWC-V12-PREVIEW-TEST.zip`.
3. Crear el flujo como recurso nuevo.
4. En la referencia SharePoint, elegir exclusivamente la conexión FOUNDERS HUB existente.
5. Completar la importación.
6. Antes de habilitar o ejecutar, abrir el diseñador y verificar:
   - disparador manual;
   - URL fija `https://universidadeaneduco.sharepoint.com/sites/SWC-Mentorias-TEST` en cada acción SharePoint;
   - todos los métodos son GET;
   - no existen acciones de creación o actualización.

## Ejecutar PREVIEW

1. Habilitar únicamente `SWC-V12-PREVIEW-TEST`.
2. Ejecutarlo manualmente sin parámetros.
3. Abrir el historial de ejecución.
4. Descargar o copiar las salidas de `Resultado_JSON` e `Informe_Markdown`.
5. Para cada consulta de permisos, revisar si el estado es `VERIFICABLE` o `NO_VERIFICABLE`.
6. Deshabilitar el flujo después de capturar la evidencia si no se necesita otra ejecución.

## Criterio de continuación

- Cualquier `CONFLICTO` bloquea la provisión.
- Los recursos `NUEVO` son candidatos a creación futura.
- Un permiso `NO_VERIFICABLE` no bloquea el inventario estructural, pero impide afirmar que las listas sensibles están protegidas.
- No importar PROVISION hasta revisar y aprobar el informe real.

No ejecutar la migración documental ni los flujos funcionales durante esta fase.
