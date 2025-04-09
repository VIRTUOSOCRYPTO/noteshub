import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPasswordSchema } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  
  // Get token from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  
  // If no token is present in the URL, display error
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Reset Link</CardTitle>
            <CardDescription className="text-center">
              The password reset link is missing a required token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-600" />
            <p>Please request a new password reset link from the login page.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => setLocation('/auth')}>
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Define form validation with the schema
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
      token: token,
    }
  });
  
  const onSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
    setIsLoading(true);
    
    try {
      await apiRequest('POST', '/api/reset-password', data);
      
      setStatus('success');
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
    } catch (error) {
      setStatus('error');
      toast({
        title: "Error",
        description: "Failed to reset password. The link may have expired or is invalid.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show success page after reset
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">Password Reset Successful</CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <p>You can now log in with your new password.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => setLocation('/auth')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <input type="hidden" {...form.register('token')} />
              
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your new password" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      At least 6 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm your new password" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {status === 'error' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                  <p className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    The reset link has expired or is invalid. Please request a new one.
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset Password
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <Link href="/auth" className="underline hover:text-primary">
                  Return to login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}