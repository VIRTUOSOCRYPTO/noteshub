/**
 * API Service Module
 * 
 * Centralizes API URL configuration and request handling for the application.
 * Automatically handles environment-specific API URLs and integrates with certificate pinning.
 */

import { pinnedFetch } from "./certificate-pinning";
import { getApiUrl, getAccessToken, getRefreshToken, storeAuthTokens, clearAuthTokens } from "./auth-utils";

// Determine the environment-specific API base URL
const getApiBaseUrl = (): string => {
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  return '';
};

// Get the appropriate fetch implementation based on environment
const getFetchImplementation = (): typeof fetch => {
  return import.meta.env.PROD ? pinnedFetch : window.fetch;
};

// API base URL to be used for all requests
// In production, this should point to your Replit backend URL
// In development, we use an empty string to make relative requests to the same origin
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Selected fetch implementation
export const apiFetch = getFetchImplementation();

/**
 * Make an API request with proper error handling
 * 
 * @param endpoint - API endpoint (starting with /)
 * @param options - Fetch options
 * @returns Promise with response
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  // Use our utility function to get the formatted URL
  const url = getApiUrl(endpoint);

  // Get access token from auth utils
  const accessToken = getAccessToken();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Add Authorization header if we have an access token
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  };

  const fetchOptions = { ...defaultOptions, ...options };

  try {
    let response = await apiFetch(url, fetchOptions);

    // If the response is 401 Unauthorized, try to refresh the token
    const refreshToken = getRefreshToken();
    if (response.status === 401 && refreshToken) {
      try {
        // Try to refresh the token
        const refreshResponse = await fetch(getApiUrl('/api/auth/refresh-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include'
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // Store the new tokens
          storeAuthTokens(refreshData.accessToken, refreshData.refreshToken);
          
          // Retry the original request with the new token
          const retryOptions = {
            ...fetchOptions,
            headers: {
              ...fetchOptions.headers,
              'Authorization': `Bearer ${refreshData.accessToken}`
            }
          };
          
          response = await apiFetch(url, retryOptions);
        } else {
          // If refresh fails, clear tokens
          clearAuthTokens();
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, clear tokens
        clearAuthTokens();
      }
    }

    if (!response.ok) {
      let errorMessage = `Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Fall back to default message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
};

/**
 * Helper function for GET requests
 */
export const apiGet = <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
};

/**
 * Helper function for POST requests
 */
export const apiPost = <T = any>(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
    headers: data instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' },
  });
};

/**
 * Helper function for PUT requests
 */
export const apiPut = <T = any>(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Helper function for PATCH requests
 */
export const apiPatch = <T = any>(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

/**
 * Helper function for DELETE requests
 */
export const apiDelete = <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
};
