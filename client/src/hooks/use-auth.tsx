import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { loginUserSchema, registerUserSchema, type User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  getApiUrl, 
  storeAuthTokens, 
  clearAuthTokens, 
  getRefreshToken, 
  getAccessToken 
} from "../lib/auth-utils";

interface LoginResponse {
  user: Omit<User, "password">;
  accessToken?: string;
  refreshToken?: string;
  twoFactorRequired?: boolean;
}

interface RegisterResponse {
  user: Omit<User, "password">;
  accessToken?: string;
  refreshToken?: string;
}

type AuthContextType = {
  user: Omit<User, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, z.infer<typeof loginUserSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, z.infer<typeof registerUserSchema>>;
  refreshToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<User, "password"> | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        return await res.json();
      } catch (error) {
        if (error instanceof Response && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  });

  // Function to refresh the access token
  const refreshTokenFn = async (): Promise<string | null> => {
    const storedRefreshToken = getRefreshToken();
    
    if (!storedRefreshToken) {
      return null;
    }
    
    try {
      const response = await fetch(getApiUrl('/api/auth/refresh-token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If refresh fails, clear stored tokens
        clearAuthTokens();
        return null;
      }
      
      const data = await response.json();
      
      // Store the new tokens
      storeAuthTokens(data.accessToken, data.refreshToken);
      
      return data.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearAuthTokens();
      return null;
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginUserSchema>) => {
      const response = await fetch(getApiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      return await response.json();
    },
    onSuccess: (data: LoginResponse) => {
      // Store user data in the query cache
      if (data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
        
        // Store tokens if provided
        if (data.accessToken && data.refreshToken) {
          storeAuthTokens(data.accessToken, data.refreshToken);
        }
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.usn}!`,
        });
      } else if (data.twoFactorRequired) {
        toast({
          title: "Two-factor authentication required",
          description: "Please enter your 2FA code",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof registerUserSchema>) => {
      const response = await fetch(getApiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      return await response.json();
    },
    onSuccess: (data: RegisterResponse) => {
      queryClient.setQueryData(["/api/user"], data.user);
      
      // Store tokens if provided
      if (data.accessToken && data.refreshToken) {
        storeAuthTokens(data.accessToken, data.refreshToken);
      }
      
      toast({
        title: "Registration successful",
        description: `Welcome to NotesHub, ${data.user.usn}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Try to revoke refresh token if it exists
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          await fetch(getApiUrl('/api/auth/revoke-token'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAccessToken()}`
            },
            credentials: 'include'
          });
        } catch (error) {
          console.error('Error revoking token:', error);
        }
      }
      
      // Also do session-based logout
      await fetch(getApiUrl('/api/logout'), {
        method: 'POST',
        credentials: 'include'
      });
      
      // Remove tokens from local storage
      clearAuthTokens();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refreshToken: refreshTokenFn
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}