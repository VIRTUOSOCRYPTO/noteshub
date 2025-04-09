import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL } from "./api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
      : `${API_BASE_URL}/${url}`;
  
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
      : endpoint.startsWith('/') 
        ? `${API_BASE_URL}${endpoint}` 
        : endpoint;
    
    // Use the secure fetch implementation with certificate pinning
    const res = await apiFetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
    
    return await response.json();
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    throw error;
  }
};
