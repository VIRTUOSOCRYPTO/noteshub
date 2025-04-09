import { useQuery } from "@tanstack/react-query";
import NoteCard from "./NoteCard";
import { SearchNotesParams, Note } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { DEPARTMENTS } from "@/lib/constants";

interface NotesListProps {
  filters: SearchNotesParams;
}

export default function NotesList({ filters }: NotesListProps) {
  const { user } = useAuth();
  const [effectiveFilters, setEffectiveFilters] = useState<SearchNotesParams>(filters);
  
  // Update effective filters when user's filters change
  useEffect(() => {
    // Use user's filters as provided without auto-adding department
    setEffectiveFilters(filters);
  }, [filters, user]);

  // Create the query string from filters
  const getQueryString = () => {
    const params = new URLSearchParams();
    
    // Add department filter if not "all"
    if (filters.department && filters.department !== "all") {
      params.append('department', filters.department);
    }
    
    // Add subject filter if not "all"
    if (filters.subject && filters.subject !== "all") {
      params.append('subject', filters.subject);
    }
    
    // Always send the showAllDepartments parameter (as true or false)
    params.append('showAllDepartments', filters.showAllDepartments ? 'true' : 'false');
    
    // Always send showAllYears parameter as false to ensure only same-year notes are shown
    // This is our core implementation for ensuring students only see notes from their academic year
    params.append('showAllYears', 'false');
    
    console.log('Filter params sent to API:', Object.fromEntries(params.entries()));
    
    return params.toString();
  };

  const queryString = getQueryString();
  const { data: notes, isLoading, error } = useQuery<Note[]>({
    queryKey: ['/api/notes', queryString],
    // Set the full URL including query string to ensure parameters are sent
    staleTime: 10000, // 10 seconds
    // Explicitly set the URL with query parameters
    queryFn: async () => {
      const response = await fetch(`/api/notes?${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return await response.json();
    }
  });

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading notes: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium text-gray-800">Available Notes</h2>
        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">{isLoading ? '...' : notes?.length || 0}</span> notes
        </div>
      </div>
      
      {user && (
        <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg dark:bg-blue-200 dark:text-blue-800">
          <div className="flex items-center">
            <svg className="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            <span className="font-medium">Academic Year Restriction:</span>&nbsp;
            You are only seeing notes from Year {user.year}. This ensures content is relevant to your current studies.
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100 p-8">
          <div className="mb-4 text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Notes Found</h3>
          <p className="text-gray-600 mb-4">
            {effectiveFilters.department || effectiveFilters.subject ? 
              `No notes match your current filters. Try broadening your search criteria.` : 
              `There are no notes available yet. Be the first to upload notes!`
            }
          </p>
          {(effectiveFilters.department || effectiveFilters.subject) && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {effectiveFilters.department && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Department: {effectiveFilters.department} ({DEPARTMENTS.find(d => d.value === effectiveFilters.department)?.code || ''})
                </span>
              )}
              {effectiveFilters.subject && (
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Subject: {effectiveFilters.subject}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
