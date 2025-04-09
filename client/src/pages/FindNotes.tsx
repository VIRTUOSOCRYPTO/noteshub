import FilterSection from "@/components/notes/FilterSection";
import NotesList from "@/components/notes/NotesList";
import { useState } from "react";
import { SearchNotesParams } from "@shared/schema";
import { Search } from "lucide-react";
import { usePageVisits } from "@/hooks/use-page-visits";

export default function FindNotes() {
  // Track page visit for App Explorer achievement
  usePageVisits('find-notes');
  
  const [filters, setFilters] = useState<SearchNotesParams>({
    department: undefined,
    subject: undefined,
    showAllDepartments: false
  });

  const handleFilter = (newFilters: SearchNotesParams) => {
    setFilters(newFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center space-x-2">
        <Search className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">Find Notes</h1>
      </div>
      <p className="text-gray-600 mb-8">Apply filters to find notes shared by other students</p>
      
      <FilterSection onFilter={handleFilter} />
      <NotesList filters={filters} />
    </div>
  );
}