/**
 * API Configuration Utility for Decoupled Vercel Deployment
 * Configured via VITE_BACKEND_URL environment variable.
 */

export const getBackendBaseUrl = (): string => {
  const url = import.meta.env.VITE_BACKEND_URL;
  if (url && url.trim() !== '') {
    // Remove trailing slash if present
    return url.replace(/\/$/, '');
  }
  // Default to local backend server port
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
