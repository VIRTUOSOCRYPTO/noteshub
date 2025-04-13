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
    console.log('Using API base URL from environment:', envApiBaseUrl);
    return envApiBaseUrl;
  }

  // Check if we're running on Firebase hosting
  const isFirebaseHosting = window.location.hostname.includes('web.app') || 
                          window.location.hostname.includes('firebaseapp.com');

  if (isFirebaseHosting || import.meta.env.PROD) {
    // For production with Firebase hosting + Render backend
    console.log('Using production Render backend URL');
    return 'https://noteshub-api-gqkp.onrender.com';
  }

  // For development, the default is empty string which means same-origin
  console.log('Using same-origin API URL (development)');
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
export const API_BASE_URL = getApiBaseUrl();

// Log the API base URL for debugging (not in production)
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

// Auth token storage
let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  document.cookie = `auth_token=${token}; path=/; SameSite=None; Secure`;
};

export const getAuthToken = (): string | null => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
    
    // Also try to get from cookies if not in localStorage
    if (!authToken) {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='));
      
      if (cookieValue) {
        authToken = cookieValue.split('=')[1];
        // Sync to localStorage
        localStorage.setItem('auth_token', authToken);
      }
    }
  }
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
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
    // Add explicit Origin header to prevent CORS issues
    'Origin': window.location.origin
  };
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge with any headers from options
  if (options.headers) {
    headers = { ...headers, ...options.headers };
  }

  // Enhanced cross-origin API request configuration
  // Critical for cross-origin communication between Firebase hosting and Render
  
  // Determine if we need 'include' credentials based on whether the request is cross-origin
  const isCrossOrigin = API_BASE_URL !== '' && !API_BASE_URL.startsWith(window.location.origin);
  console.log(`Request type: ${isCrossOrigin ? 'cross-origin' : 'same-origin'}`);
  
  // Always set credentials to include for all requests
  // This ensures cookies/auth will be sent properly, even for cross-origin requests
  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include',
    // Only set mode:'cors' for cross-origin requests to avoid unnecessary preflight in same-origin
    mode: isCrossOrigin ? 'cors' : 'same-origin'
  };

  const fetchOptions = { ...defaultOptions, ...options };

  try {
    console.log(`Making API request to ${url} with:`, {
      method: fetchOptions.method || 'GET',
      credentials: fetchOptions.credentials,
      mode: fetchOptions.mode,
      headers: fetchOptions.headers
    });
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let responseData: T;
    
    try {
      const response = await apiFetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Get key response headers individually to avoid iterator compatibility issues
      const responseHeaders: Record<string, string> = {
        'content-type': response.headers.get('content-type') || '',
        'content-length': response.headers.get('content-length') || '',
        'access-control-allow-origin': response.headers.get('access-control-allow-origin') || '',
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials') || ''
      };
      
      console.log(`Received response from ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

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
      
      // Process successful response
      if (response.status === 204) {
        responseData = {} as T;
      } else {
        responseData = await response.json() as T;
      }
      
      return responseData;
      
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      console.error(`Fetch error for ${url}:`, error);
      
      // Improved error message for network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after 15 seconds: ${url}`);
        } else if (error instanceof TypeError && error.message.includes('NetworkError')) {
          throw new Error(`Network error - Check if the server is running and accessible: ${url}`);
        }
      }
      
      throw error;
    }
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
