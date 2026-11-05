// Módulo preparado, todavía no conectado a index.html. Requiere que la versión
// aprobada de @azure/msal-browser se cargue antes como global `msal` y que
// msal.config.js exista localmente; ambos pasos quedan sujetos a la prueba TEST.
import { institutionalAuthConfig, createMsalConfig } from './msal.config.js';

function library() {
  if (!globalThis.msal?.PublicClientApplication) throw new Error('MSAL Browser no está cargado.');
  return globalThis.msal;
}

const instance = new (library().PublicClientApplication)(createMsalConfig());

export async function initializeAuthentication() {
  await instance.initialize();
  const result = await instance.handleRedirectPromise();
  const account = result?.account || instance.getActiveAccount() || instance.getAllAccounts()[0] || null;
  if (account) instance.setActiveAccount(account);
  return account;
}

export async function signIn() {
  const result = await instance.loginPopup({ scopes: ['openid', 'profile'] });
  instance.setActiveAccount(result.account);
  return result.account;
}

export async function signOut() {
  const account = instance.getActiveAccount();
  await instance.logoutRedirect({ account, postLogoutRedirectUri: institutionalAuthConfig.postLogoutRedirectUri });
}

export async function acquireFlowToken() {
  const account = instance.getActiveAccount();
  if (!account) throw new Error('No existe una sesión institucional activa.');
  const request = { account, scopes: institutionalAuthConfig.flowScopes };
  try {
    return (await instance.acquireTokenSilent(request)).accessToken;
  } catch (error) {
    if (error instanceof library().InteractionRequiredAuthError) return (await instance.acquireTokenPopup(request)).accessToken;
    throw error;
  }
}

export function authenticatedAccount() {
  return instance.getActiveAccount();
}
