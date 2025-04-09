/**
 * Authentication Utilities
 * 
 * Centralizes auth-related utility functions for consistent handling across the application
 */

/**
 * Constructs API URLs consistently based on environment
 * 
 * @param endpoint API endpoint (starting with /)
 * @returns Full URL including base URL if configured or in production
 */
export const getApiUrl = (endpoint: string): string => {
  // First check for explicit API base URL from environment
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If we have an explicit base URL from environment, use it
  const baseUrl = envApiBaseUrl ? envApiBaseUrl : 
                  // Otherwise in production, use origin (same-server deployment)
                  import.meta.env.PROD ? window.location.origin : 
                  // In development, use relative paths
                  '';
                  
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${formattedEndpoint}`;
};

/**
 * Stores authentication tokens in localStorage
 * 
 * @param accessToken JWT access token
 * @param refreshToken JWT refresh token
 */
export const storeAuthTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Clears authentication tokens from localStorage
 */
export const clearAuthTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Gets the stored access token
 * 
 * @returns Access token or null if not found
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Gets the stored refresh token
 * 
 * @returns Refresh token or null if not found
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

/**
 * Checks if user is authenticated based on token presence
 * 
 * @returns True if access token exists
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

/**
 * Builds Authorization header value if token exists
 * 
 * @returns Authorization header with Bearer token or empty object
 */
export const getAuthHeader = (): { Authorization?: string } => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};