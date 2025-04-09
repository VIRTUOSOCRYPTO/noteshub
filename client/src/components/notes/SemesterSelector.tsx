import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SEMESTERS_BY_YEAR } from "@shared/schema";

interface SemesterSelectorProps {
  yearValue: number | null;
  value: number | null;
  onChange: (value: number | null) => void;
}

export function SemesterSelector({ yearValue, value, onChange }: SemesterSelectorProps) {
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);

  // Update available semesters when year changes
  useEffect(() => {
    if (yearValue) {
      const semesters = SEMESTERS_BY_YEAR[yearValue] || [];
      setAvailableSemesters(semesters);
      
      // If current value is not in the new available semesters, reset it
      if (value && !semesters.includes(value)) {
        onChange(null);
      }
    } else {
      setAvailableSemesters([]);
      onChange(null);
    }
  }, [yearValue, value, onChange]);

  if (!yearValue || availableSemesters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="semester-select">Semester</Label>
      <Select
        value={value?.toString() || ""}
        onValueChange={(val) => onChange(val ? parseInt(val) : null)}
      >
        <SelectTrigger id="semester-select" className="w-full">
          <SelectValue placeholder="Select semester" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Semesters</SelectItem>
          {availableSemesters.map((semester) => (
            <SelectItem key={semester} value={semester.toString()}>
              Semester {semester}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}