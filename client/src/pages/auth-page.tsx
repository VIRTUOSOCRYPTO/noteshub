import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginUserSchema, registerUserSchema, forgotPasswordSchema, KARNATAKA_COLLEGES, COLLEGE_CODES, VALID_YEARS } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Redirect, Link } from "wouter";
import { Loader2, GraduationCap, BookOpen, Mail } from "lucide-react";
import { DEPARTMENTS } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/40">
      {/* Left Section - Auth Forms */}
      <div className="flex-1 p-4 md:p-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">NotesHub</h1>
            <p className="text-muted-foreground mt-2">
              Access and share notes with your department colleagues
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-4">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register" className="mt-4">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Section - Hero Image/Info */}
      <div className="flex-1 bg-gradient-to-br from-primary-foreground to-primary p-8 text-black flex flex-col justify-center md:justify-start">
        <div className="max-w-xl mx-auto md:mt-32">
          <h2 className="text-4xl font-bold mb-6">Your Department's Notes in One Place</h2>
          <p className="text-xl mb-8">
            NotesHub helps you discover, share and collaborate with others in your department. 
            Access course materials, lecture notes, and study guides shared by your peers.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-black">Department Specific</h3>
                <p className="text-black">Notes are filtered to your department automatically</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-black">Easy Uploads</h3>
                <p className="text-black">Share your notes with a few clicks</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-black">Multiple File Types</h3>
                <p className="text-black">PDF, Word, PowerPoint, and more supported</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  
  const form = useForm<z.infer<typeof loginUserSchema>>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      usn: "",
      password: ""
    }
  });
  
  const onSubmit = (data: z.infer<typeof loginUserSchema>) => {
    loginMutation.mutate(data, {
      onError: (error) => {
        // Set specific field errors based on the error message
        if (error.message.includes("USN not registered")) {
          form.setError("usn", { 
            type: "manual", 
            message: "USN not registered. Please register first." 
          });
        } else if (error.message.includes("Incorrect password")) {
          form.setError("password", { 
            type: "manual", 
            message: "Incorrect password. Please try again." 
          });
        }
      }
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your USN and password to access your account</CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="usn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USN</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your USN (e.g., 1SI20CS045 or 22EC101)" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={loginMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your password" 
                      {...field} 
                      disabled={loginMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {loginMutation.error && !form.formState.errors.usn && !form.formState.errors.password && (
              <div className="text-red-600 dark:text-red-400 text-sm p-2 border border-red-300 rounded bg-red-50 dark:bg-red-900/20">
                {loginMutation.error.message}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
            

            
            <ForgotPasswordDialog />
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const [usnCode, setUsnCode] = useState<string>("");
  const [usnError, setUsnError] = useState<string | null>(null);
  const [collegeCode, setCollegeCode] = useState<string>("");
  const [customCollegeName, setCustomCollegeName] = useState<string>("");
  
  const form = useForm<z.infer<typeof registerUserSchema>>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      usn: "",
      email: "",
      department: "",
      college: "",
      year: undefined, // No default year, user must select
      password: "",
      confirmPassword: ""
    }
  });
  
  // Extract the department code, college, and year from USN as user types
  const handleUsnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    form.setValue("usn", value);
    
    // Define regex patterns for USN validation
    // Format: 1SI20CS045 (standard format with college code in positions 2-3)
    const standardPattern = /^[0-9]([A-Z]{2})([0-9]{2})([A-Z]{2})[0-9]{3}$/;
    // Format: 22EC101 (short format without college code)
    const shortPattern = /^([0-9]{2})([A-Z]{2})[0-9]{3}$/;
    
    // Convert the USN to uppercase for consistent processing
    const upperValue = value.toUpperCase();
    
    const standardMatch = upperValue.match(standardPattern);
    const shortMatch = upperValue.match(shortPattern);
    
    if (standardMatch) {
      // Standard format: 1SI20CS045
      // Extract the college code from the first capture group
      const collegeCode = standardMatch[1];
      // Extract the year from the second capture group (positions 4-5)
      const yearCode = standardMatch[2];
      // Extract the department code from the third capture group
      const deptCode = standardMatch[3];
      
      setUsnCode(deptCode);
      setCollegeCode(collegeCode);
      
      // Find matching department from the code
      const matchingDept = DEPARTMENTS.find(dept => dept.code === deptCode);
      
      // Auto-select college based on college code
      if (COLLEGE_CODES[collegeCode]) {
        // Known college code - set the value directly
        form.setValue("college", COLLEGE_CODES[collegeCode]);
      } else {
        // Unknown college code - set to "other"
        form.setValue("college", "other");
        
        // Create a default college name from the college code
        const defaultCollegeName = `${collegeCode} College`;
        setCustomCollegeName(defaultCollegeName);
      }
      
      // Suggest year based on year code (e.g., 20 = 2020)
      // For students who joined in 2020, they'd be in 3rd year in 2023
      const currentYear = new Date().getFullYear();
      const joiningYear = 2000 + parseInt(yearCode);
      let suggestedYear = currentYear - joiningYear + 1;
      
      // Suggest the year if it's within valid range, but don't override user selection
      if (suggestedYear >= 1 && suggestedYear <= 4) {
        // Only set if no selection has been made yet
        const currentYearValue = form.getValues("year");
        if (currentYearValue === undefined) {
          form.setValue("year", suggestedYear);
        }
      }
      
      if (matchingDept) {
        // Auto-select the department
        form.setValue("department", matchingDept.value);
        setUsnError(null);
      } else {
        setUsnError(`Department code '${deptCode}' not recognized. Please check your USN.`);
      }
    } else if (shortMatch) {
      // Short format: 22EC101
      // Extract year code from the first capture group
      const yearCode = shortMatch[1];
      // Extract department code from the second capture group
      const deptCode = shortMatch[2];
      
      setUsnCode(deptCode);
      setCollegeCode("");
      
      // Find matching department from the code
      const matchingDept = DEPARTMENTS.find(dept => dept.code === deptCode);
      
      // For short format, we don't have college code, so set to "other"
      form.setValue("college", "other");
      setCustomCollegeName(""); // Clear any previous custom college name
      
      // Suggest year based on year code (e.g., 22 = 2022)
      const currentYear = new Date().getFullYear();
      const joiningYear = 2000 + parseInt(yearCode);
      let suggestedYear = currentYear - joiningYear + 1;
      
      // Suggest the year if it's within valid range, but don't override user selection
      if (suggestedYear >= 1 && suggestedYear <= 4) {
        // Only set if no selection has been made yet
        const currentYearValue = form.getValues("year");
        if (currentYearValue === undefined) {
          form.setValue("year", suggestedYear);
        }
      }
      
      if (matchingDept) {
        // Auto-select the department
        form.setValue("department", matchingDept.value);
        setUsnError(null);
      } else {
        setUsnError(`Department code '${deptCode}' not recognized. Please check your USN.`);
      }
    } else if (value.length >= 7) { // Short USN length is at least 7 characters
      // If USN is long enough but doesn't match any pattern
      setUsnError("Invalid USN format. Examples: 1SI20CS045 or 22EC101");
      setUsnCode("");
      setCollegeCode("");
    } else {
      setUsnCode("");
      setCollegeCode("");
      setUsnError(null);
    }
  };
  
  const onSubmit = (data: z.infer<typeof registerUserSchema>) => {
    // If the college is "other" and we have a custom college name, update the data
    let formData = { ...data } as z.infer<typeof registerUserSchema> & { customCollegeName?: string };
    
    // If the form shows "other" as college and we have a custom name, store it
    if (formData.college === "other" && customCollegeName.trim()) {
      // We are still submitting "other" as the college value, but we can
      // store the custom name in the database through a custom parameter
      // For storage implementation, the custom name could go in a separate field
      // or be handled in registration logic
      formData.customCollegeName = customCollegeName.trim();
    }
    
    registerMutation.mutate(formData, {
      onError: (error) => {
        // If the error contains "already exists", set a custom form error
        if (error.message.includes("already exists")) {
          form.setError("usn", { 
            type: "manual", 
            message: "This USN is already registered. Please login instead." 
          });
        }
      }
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Enter your details to register</CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="usn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USN</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your USN (e.g., 1SI20CS045 or 22EC101)" 
                      {...field}
                      onChange={handleUsnChange}
                      disabled={registerMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription className="flex flex-col gap-1">
                    {usnError && (
                      <span className="text-red-600 dark:text-red-400 text-sm">
                        {usnError}
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="Enter your email address" 
                      {...field} 
                      disabled={registerMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription></FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  {usnCode ? (
                    // For recognized department codes - show detected department with disabled select
                    <>
                      <Select
                        disabled={true}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex items-center">
                            <BookOpen className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Department from USN" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value}>
                              {dept.label} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription></FormDescription>
                    </>
                  ) : (
                    // No department code detected yet
                    <>
                      <Select
                        disabled={true}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex items-center">
                            <BookOpen className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Enter USN to detect department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value}>
                              {dept.label} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription></FormDescription>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value ? field.value.toString() : undefined}
                    disabled={registerMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="flex items-center">
                        <SelectValue placeholder="Select your year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VALID_YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year === 1 ? "1st Year" : 
                           year === 2 ? "2nd Year" : 
                           year === 3 ? "3rd Year" : 
                           year === 4 ? "4th Year" : `${year}th Year`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription></FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="college"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>College</FormLabel>
                  {COLLEGE_CODES[collegeCode] ? (
                    // For known college codes - show detected college with disabled select
                    <>
                      <Select
                        disabled={true}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex items-center">
                            <GraduationCap className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Auto-detected college" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {KARNATAKA_COLLEGES.map((college) => (
                            <SelectItem key={college.value} value={college.value}>
                              {college.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription></FormDescription>
                    </>
                  ) : collegeCode || field.value === "other" ? (
                    // For unknown college codes - show custom input field
                    <>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            placeholder="Enter your college name"
                            value={customCollegeName}
                            onChange={(e) => {
                              setCustomCollegeName(e.target.value);
                              // Set custom college name to the college field
                              // We'll store it in the "other" field but with custom name
                              field.onChange("other");
                            }}
                            disabled={registerMutation.isPending}
                          />
                        </FormControl>
                        {/* Hidden select to maintain form validation */}
                        <input type="hidden" {...field} value="other" />
                      </div>
                      <FormDescription></FormDescription>
                    </>
                  ) : (
                    // No USN entered yet
                    <>
                      <Select
                        disabled={true}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex items-center">
                            <GraduationCap className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Enter USN first" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {KARNATAKA_COLLEGES.map((college) => (
                            <SelectItem key={college.value} value={college.value}>
                              {college.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription></FormDescription>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a password" 
                      {...field} 
                      disabled={registerMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription></FormDescription>
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
                      placeholder="Confirm your password" 
                      {...field} 
                      disabled={registerMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {registerMutation.error && (
              <div className="text-red-600 dark:text-red-400 text-sm p-2 border border-red-300 rounded bg-red-50 dark:bg-red-900/20">
                {registerMutation.error.message.includes("already exists") 
                  ? "This USN is already registered. Please login instead."
                  : registerMutation.error.message
                }
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Register
            </Button>
            

          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function ForgotPasswordDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    }
  });
  
  const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/forgot-password', data);
      
      // In a real application, the link would be sent via email
      // For demo, we display it to the user
      const responseData = await response.json();
      if (responseData.resetLink) {
        setResetLink(responseData.resetLink);
      }
      
      setResetSent(true);
      toast({
        title: "Reset email sent",
        description: "If an account exists with that email, you'll receive a password reset link.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="link" 
          size="sm" 
          className="w-full text-muted-foreground hover:text-primary"
        >
          Forgot your password?
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {resetSent 
              ? "Check your email for the password reset link."
              : "Enter your email to receive a password reset link."}
          </DialogDescription>
        </DialogHeader>
        
        {resetSent ? (
          <div className="space-y-4">
            {resetLink && (
              <div className="p-3 bg-muted rounded-md text-sm overflow-auto">
                <p className="font-semibold mb-2">Demo Only: Password Reset Link</p>
                <p className="break-all">{resetLink}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              In a real application, this link would be sent to your email.
            </p>
            <DialogFooter>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your email address" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Reset Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}