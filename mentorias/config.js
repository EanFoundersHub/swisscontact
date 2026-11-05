// Configuración segura de ejemplo. Sustituya únicamente por URLs de un proxy
// autenticado con Entra ID; nunca pegue aquí secretos ni URL firmadas de flujo.
const saved = JSON.parse(localStorage.getItem('SWC_API_CONFIG') || '{}');
export default {
  apiUrl: saved.apiUrl || window.SWC_CONFIG?.apiUrl || '',
  adminApiUrl: saved.adminApiUrl || window.SWC_CONFIG?.adminApiUrl || '',
  timeoutMs: 30000
};
