import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { loginUserSchema, registerUserSchema, type User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { setAuthToken, clearAuthToken } from "../lib/api";
import { z } from "zod";

interface LoginResponse {
  user: Omit<User, "password">;
  accessToken: string;
  refreshToken: string;
  twoFactorRequired?: boolean;
}

type AuthContextType = {
  user: Omit<User, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, z.infer<typeof loginUserSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<User, "password">, Error, z.infer<typeof registerUserSchema>>;
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

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginUserSchema>) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: LoginResponse) => {
      // Store auth tokens for future API requests
      if (data.accessToken) {
        setAuthToken(data.accessToken);
        
        // Store user data in React Query cache
        queryClient.setQueryData(["/api/user"], data.user);
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.usn}!`,
        });
      } else if (data.twoFactorRequired) {
        // Handle 2FA if implemented
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
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: Omit<User, "password">) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to NotesHub, ${user.usn}!`,
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
      try {
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        console.log("Logout API request failed, but we'll clear local tokens anyway");
        // Continue with local logout even if server request fails
      }
    },
    onSuccess: () => {
      // Clear auth token from localStorage and memory
      clearAuthToken();
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      // Even if there's an error, still clear local tokens
      clearAuthToken();
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout notice",
        description: "You have been logged out locally. Server sync may have failed.",
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
