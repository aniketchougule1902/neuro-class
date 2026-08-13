/**
 * API Configuration Utility for Decoupled Vercel Deployment
 * Configured via VITE_BACKEND_URL environment variable.
 */

export const getBackendBaseUrl = (): string => {
  const env = (import.meta as { env?: { VITE_BACKEND_URL?: string } }).env;
  const url = env?.VITE_BACKEND_URL;
  if (url && url.trim() !== '') {
    return url.replace(/\/$/, '');
  }
  return 'http://localhost:9000';
};

/**
 * Returns full API endpoint URL given a relative path (e.g. '/api/ai/generate-test')
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getBackendBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};
