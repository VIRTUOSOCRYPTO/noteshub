import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  DEPARTMENTS, 
  SUBJECTS,
  DEPARTMENT_SUBJECTS
} from "@/lib/constants";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-container";
import { SearchNotesParams, VALID_YEARS } from "@shared/schema";

interface FilterSectionProps {
  onFilter: (filters: SearchNotesParams) => void;
}

const filterSchema = z.object({
  department: z.string().optional(),
  subject: z.string().optional(),
  showAllDepartments: z.boolean().default(false)
});

export default function FilterSection({ onFilter }: FilterSectionProps) {
  
  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      department: "all",
      subject: "all",
      showAllDepartments: false
    },
  });
  
  // Watch for changes to the form fields
  const watchedDepartment = form.watch("department");
  const watchedSubject = form.watch("subject");
  const showAllDepartments = form.watch("showAllDepartments");
  
  // Count active filters (excluding "all")
  const activeFilterCount = [
    watchedDepartment !== "all" ? 1 : 0,
    watchedSubject !== "all" ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  // Apply filters automatically when any filter changes
  useEffect(() => {
    // Get current values
    const currentValues = form.getValues();
    
    // Convert "all" values to undefined
    const filters: SearchNotesParams = {
      department: currentValues.department === "all" ? undefined : currentValues.department,
      subject: currentValues.subject === "all" ? undefined : currentValues.subject,
      showAllDepartments: currentValues.showAllDepartments
    };

    // Apply filters
    onFilter(filters);
  }, [
    watchedDepartment, 
    watchedSubject, 
    showAllDepartments,
    form, 
    onFilter
  ]);

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Find Notes</h2>
        
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label} ({dept.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => {
                  // Get subjects for the selected department or use default subjects
                  const subjectsToShow = 
                    watchedDepartment && 
                    watchedDepartment !== "all" && 
                    DEPARTMENT_SUBJECTS[watchedDepartment as keyof typeof DEPARTMENT_SUBJECTS]
                      ? DEPARTMENT_SUBJECTS[watchedDepartment as keyof typeof DEPARTMENT_SUBJECTS]
                      : SUBJECTS;
                  
                  // Reset subject field when department changes
                  useEffect(() => {
                    if (field.value !== "all") {
                      // Check if the current subject exists in the new department's subject list
                      const subjectExists = subjectsToShow.some(s => s.value === field.value);
                      if (!subjectExists) {
                        form.setValue("subject", "all");
                      }
                    }
                  }, [watchedDepartment, field.value, form, subjectsToShow]);
                  
                  return (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjectsToShow.map(subject => (
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
              

            </div>
            
            <div className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="showAllDepartments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Show notes from all departments</FormLabel>
                      <FormDescription>
                        When unchecked, only shows notes from your department by default.
                        Check this to see notes from other departments as well.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              

            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div className="flex items-center">
                {activeFilterCount > 0 && (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Active Filters:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {watchedDepartment !== "all" && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {DEPARTMENTS.find(d => d.value === watchedDepartment)?.label || watchedDepartment} ({DEPARTMENTS.find(d => d.value === watchedDepartment)?.code || watchedDepartment})
                        </span>
                      )}
                      {watchedSubject !== "all" && (
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {watchedDepartment !== "all" && DEPARTMENT_SUBJECTS[watchedDepartment as keyof typeof DEPARTMENT_SUBJECTS] 
                            ? DEPARTMENT_SUBJECTS[watchedDepartment as keyof typeof DEPARTMENT_SUBJECTS].find(s => s.value === watchedSubject)?.label
                            : SUBJECTS.find(s => s.value === watchedSubject)?.label || watchedSubject}
                        </span>
                      )}

                    </div>
                  </div>
                )}
              </div>
              <Button 
                type="button" 
                className="flex items-center gap-2"
                variant={activeFilterCount > 0 ? "default" : "outline"}
                onClick={() => {
                  // Clear all filters
                  form.reset({
                    department: "all",
                    subject: "all",
                    showAllDepartments: form.getValues().showAllDepartments
                  });
                  
                  // Apply the reset
                  onFilter({});
                  
                  if (activeFilterCount > 0) {
                    showToast("All filters cleared", "info");
                  }
                }}
              >
                {activeFilterCount > 0 ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                    <span>Clear Filters</span>
                    <span className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-semibold text-white bg-white bg-opacity-20 rounded-full">
                      {activeFilterCount}
                    </span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Showing All Notes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
