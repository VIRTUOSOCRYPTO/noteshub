import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL } from "./api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    try {
      // Try to parse as JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorText = errorData.error || errorData.message || res.statusText;
      } else {
        // Not JSON, just get text
        errorText = await res.text();
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      errorText = `Failed to parse response: ${res.statusText}`;
    }
    
    const errorMessage = `${res.status}: ${errorText}`;
    console.error(`API Error: ${errorMessage}`, { 
      url: res.url,
      status: res.status,
      statusText: res.statusText 
    });
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  // Create full URL if needed (add base URL for absolute paths)
  const fullUrl = url.startsWith('http') 
    ? url 
    : url.startsWith('/') 
      ? `${API_BASE_URL}${url}` 
      : url;
  
  // Use the secure fetch implementation with certificate pinning
  const res = await apiFetch(fullUrl, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    
    // Create full URL if needed (add base URL for API paths)
    const fullUrl = endpoint.startsWith('http') 
      ? endpoint 
      : endpoint.startsWith('/api') 
        ? `${API_BASE_URL}${endpoint}` 
        : endpoint;
    
    // Get auth token if available
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = token 
      ? { 'Authorization': `Bearer ${token}` }
      : {};
        
    // Use the secure fetch implementation with certificate pinning
    const res = await apiFetch(fullUrl, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Safely parse JSON response
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      } else {
        console.error('Non-JSON response received from API:', await res.text());
        throw new Error('Received non-JSON response from server');
      }
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Failed to parse response from server');
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Authenticate with Google
 * @param email - User's email from Google profile
 * @param idToken - Google ID token
 * @returns Authentication result
 */
export const authenticateWithGoogle = async (email: string, idToken: string) => {
  try {
    const response = await apiRequest('POST', '/api/auth/google', {
      idToken,
      email
    });
    
    // Safely parse JSON response
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        console.error('Non-JSON response received from API:', await response.text());
        throw new Error('Received non-JSON response from server');
      }
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Failed to parse response from server');
    }
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    throw error;
  }
};
