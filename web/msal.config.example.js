export const institutionalAuthConfig = {
  tenantId: 'REPLACE_WITH_TENANT_ID',
  clientId: 'REPLACE_WITH_SPA_CLIENT_ID',
  redirectUri: 'https://REPLACE_WITH_GITHUB_ORG.github.io/REPLACE_WITH_REPOSITORY/',
  postLogoutRedirectUri: 'https://REPLACE_WITH_GITHUB_ORG.github.io/REPLACE_WITH_REPOSITORY/',
  flowScopes: ['REPLACE_WITH_APPROVED_POWER_AUTOMATE_SCOPE']
};

export function createMsalConfig(config = institutionalAuthConfig) {
  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: config.redirectUri,
      postLogoutRedirectUri: config.postLogoutRedirectUri,
      navigateToLoginRequestUrl: false
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false
    }
  };
}
