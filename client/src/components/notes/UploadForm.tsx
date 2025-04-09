import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { showToast } from "@/components/ui/toast-container";
import { useAuth } from "@/hooks/use-auth";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  DEPARTMENTS, 
  DEPARTMENT_SUBJECTS,
  SUBJECTS 
} from "@/lib/constants";
import { UploadCloud, X, FileText, Lock } from "lucide-react";

// Form schema with validation - removed usn and department validation as these will be auto-filled
const uploadSchema = z.object({
  usn: z.string(), // Will be auto-filled, so no validation needed
  department: z.string(), // Will be auto-filled, so no validation needed
  subject: z.string().min(1, "Please select or enter a subject"),
  customSubject: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be at most 100 characters"),
  file: z.instanceof(File).refine(file => file.size > 0, "Please select a file")
});

export default function UploadForm() {
  const [, navigate] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user, isLoading } = useAuth();
  
  // Initialize form with empty values
  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      usn: "",
      department: "",
      subject: "",
      customSubject: "",
      title: "",
    },
  });
  
  // State to track if custom subject is selected
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  
  // Update form with user data when it becomes available
  useEffect(() => {
    if (user) {
      // Set the user's USN and department from their profile
      form.setValue("usn", user.usn);
      
      // Ensure the department value is correctly set and matches a key in DEPARTMENT_SUBJECTS
      const departmentValue = user.department;
      console.log("Raw user department from profile:", departmentValue);
      
      // Check if the department from user profile directly matches a key in DEPARTMENT_SUBJECTS
      if (Object.keys(DEPARTMENT_SUBJECTS).includes(departmentValue)) {
        form.setValue("department", departmentValue);
        console.log("Set department directly:", departmentValue);
        
        // Set the first subject from the department's subject list as default
        if (DEPARTMENT_SUBJECTS[departmentValue as keyof typeof DEPARTMENT_SUBJECTS]?.length > 0) {
          const firstSubject = DEPARTMENT_SUBJECTS[departmentValue as keyof typeof DEPARTMENT_SUBJECTS][0].value;
          form.setValue("subject", firstSubject);
        }
      } else {
        // Otherwise try to find a matching department code
        const matchingDept = DEPARTMENTS.find(dept => dept.value === departmentValue);
        if (matchingDept) {
          form.setValue("department", matchingDept.value);
          console.log("Set department from DEPARTMENTS match:", matchingDept.value);
          
          // Set the first subject from the department's subject list as default
          if (DEPARTMENT_SUBJECTS[matchingDept.value as keyof typeof DEPARTMENT_SUBJECTS]?.length > 0) {
            const firstSubject = DEPARTMENT_SUBJECTS[matchingDept.value as keyof typeof DEPARTMENT_SUBJECTS][0].value;
            form.setValue("subject", firstSubject);
          }
        } else {
          // If still not found, use the raw value but log a warning
          form.setValue("department", departmentValue);
          console.log("WARNING: Department not found in available departments:", departmentValue);
        }
      }
    }
  }, [user, form]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      showToast("Please log in to upload notes", "error");
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/notes", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      showToast("Note uploaded successfully!", "success");
      navigate("/");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to upload note", "error");
    },
  });

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!values.file) {
      showToast("Please select a file to upload", "error");
      return;
    }

    // Validate subject when using custom subject
    if (values.subject === "custom" && !values.customSubject) {
      showToast("Please enter a custom subject name", "error");
      return;
    }

    const formData = new FormData();
    // Backend will use USN and department from the user session,
    // but we'll still include them in the form data for completeness
    
    // Use customSubject if the subject is "custom"
    const finalSubject = values.subject === "custom" ? (values.customSubject || "") : values.subject;
    formData.append("subject", finalSubject);
    formData.append("title", values.title);
    formData.append("file", values.file);

    uploadMutation.mutate(formData);
  };

  // Custom file input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      form.setValue("file", file, { shouldValidate: true });
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    form.setValue("file", undefined as any, { shouldValidate: true });
  };
  
  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <div className="animate-pulse">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!user) {
    return null; // Will redirect to auth page via useEffect
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-2 mb-6">
          <UploadCloud className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-medium text-gray-800">Upload Notes</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Read-only USN field */}
            <FormField
              control={form.control}
              name="usn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    University Serial Number (USN)
                    <Lock className="h-4 w-4 ml-1 text-gray-400" />
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        disabled 
                        className="bg-gray-50 text-gray-600" 
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>Your registered USN is used automatically</FormDescription>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Read-only Department field */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Department
                      <Lock className="h-4 w-4 ml-1 text-gray-400" />
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          value={DEPARTMENTS.find(d => d.value === field.value)?.label || field.value}
                          disabled 
                          className="bg-gray-50 text-gray-600" 
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">From registration</FormDescription>
                  </FormItem>
                )}
              />
              
              {/* Subject selector - dynamic based on department */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => {
                  // Get the current department value from the form
                  const departmentValue = form.getValues().department;
                  
                  console.log("Current Department Value:", departmentValue);
                  
                  // Get subjects for the current department or fallback to default subjects
                  let departmentSubjects = SUBJECTS; // Default
                  
                  // Check if department exists and has subjects defined
                  if (departmentValue && Object.prototype.hasOwnProperty.call(DEPARTMENT_SUBJECTS, departmentValue)) {
                    departmentSubjects = DEPARTMENT_SUBJECTS[departmentValue as keyof typeof DEPARTMENT_SUBJECTS];
                    console.log("Using department-specific subjects for:", departmentValue);
                  } else {
                    console.log("Department not found or no specific subjects defined, using default subjects");
                    console.log("Department value:", departmentValue, "with length:", departmentValue?.length);
                    console.log("Available departments:", Object.keys(DEPARTMENT_SUBJECTS));
                    console.log("Current department value type:", typeof departmentValue);
                    console.log("Is key in object?", departmentValue in DEPARTMENT_SUBJECTS);
                    
                    // Try to find the department by comparing with all available keys
                    if (departmentValue) {
                      console.log("Checking for match by comparing with available keys...");
                      const foundKey = Object.keys(DEPARTMENT_SUBJECTS).find(key => 
                        key.trim() === departmentValue.trim());
                      if (foundKey) {
                        console.log("Found matching key after trimming:", foundKey);
                        departmentSubjects = DEPARTMENT_SUBJECTS[foundKey as keyof typeof DEPARTMENT_SUBJECTS];
                      }
                    }
                  }
                  
                  return (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setIsCustomSubject(value === "custom");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="custom" className="font-medium text-primary">
                            Enter Custom Subject
                          </SelectItem>
                          <div className="border-b my-1"></div>
                          {departmentSubjects.map(subject => (
                            <SelectItem key={subject.value} value={subject.value}>
                              {subject.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Custom Subject input - only visible when "custom" is selected */}
              {isCustomSubject && (
                <FormField
                  control={form.control}
                  name="customSubject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Subject Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter subject name" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            // Also update the subject field with the custom value
                            if (e.target.value) {
                              form.setValue("subject", e.target.value);
                            } else {
                              form.setValue("subject", "custom");
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the name of your subject that's not in the list
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Complete DBMS Notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel>Upload File</FormLabel>
                  <FormControl>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {!selectedFile ? (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l4-4 4 4m0 0L12 7m4 8H8" />
                            </svg>
                            <div className="flex justify-center text-sm text-gray-600">
                              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                                <span>Upload a file</span>
                                <input 
                                  id="file-upload" 
                                  type="file" 
                                  className="sr-only"
                                  onChange={handleFileChange}
                                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX, PPT, PPTX, TXT up to 10MB</p>
                          </>
                        ) : (
                          <div className="bg-gray-50 p-3 rounded flex items-center">
                            <FileText className="h-5 w-5 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700 flex-1 truncate" title={selectedFile.name}>
                              {selectedFile.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearSelectedFile}
                              className="text-gray-500 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Note"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
