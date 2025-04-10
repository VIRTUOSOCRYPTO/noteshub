/**
 * API Service Module
 * 
 * Centralizes API URL configuration and request handling for the application.
 * Automatically handles environment-specific API URLs and integrates with certificate pinning.
 */

import { pinnedFetch } from "./certificate-pinning";

// Determine the environment-specific API base URL
const getApiBaseUrl = (): string => {
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  if (import.meta.env.PROD) {
    // For production with Firebase hosting + Render backend
    return 'https://notezhub.onrender.com';
  }

  // For development, the default is empty string which means same-origin
  return '';
};

// Get the appropriate fetch implementation based on environment
// Temporarily use window.fetch everywhere to debug connection issues
const getFetchImplementation = (): typeof fetch => {
  // Use regular fetch for now until we debug all connectivity issues
  return window.fetch;
  
  // Original implementation that we'll return to after fixing issues:
  // return import.meta.env.PROD ? pinnedFetch : window.fetch;
};

// API base URL to be used for all requests
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? "https://notezhub.onrender.com" 
    : "");

// Log the API base URL for debugging (not in production)
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

// Auth token storage
let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
};

export const getAuthToken = (): string | null => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
};

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
  // Make sure we don't double up on slashes in the URL
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = baseUrl + formattedEndpoint;

  // Add auth token to headers if available
  const token = getAuthToken();
  
  // Create headers object
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge with any headers from options
  if (options.headers) {
    headers = { ...headers, ...options.headers };
  }

  const defaultOptions: RequestInit = {
    headers,
    // Use 'include' for cross-origin requests with credentials (cookies, authorization headers)
    credentials: 'include', 
  };

  const fetchOptions = { ...defaultOptions, ...options };

  try {
    const response = await apiFetch(url, fetchOptions);

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
