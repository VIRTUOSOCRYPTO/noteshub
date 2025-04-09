import { apiRequest } from "@/lib/queryClient";
import { Note } from "@shared/schema";
import { FileText, Download, Flag, Check } from "lucide-react";
import { showToast } from "@/components/ui/toast-container";
import { 
  DEPARTMENTS,
  SUBJECTS 
} from "@/lib/constants";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ShareOptions from "./ShareOptions";
import { sanitizeText, sanitizeAnchorProps, sanitizeUrl } from "@/lib/sanitize";

interface NoteCardProps {
  note: Note;
}

export default function NoteCard({ note }: NoteCardProps) {
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [isFlagged, setIsFlagged] = useState(!!note.isFlagged);
  
  const handleDownload = async () => {
    try {
      // Show download started toast
      showToast("Download started", "success");
      
      // The download endpoint already increments the download count automatically
      // No need for a separate API call here
      
      // Start the actual download - using a sanitized URL
      window.location.href = sanitizeUrl(`/api/notes/${note.id}/download`);
    } catch (error) {
      showToast("Failed to download file", "error");
      console.error("Download error:", error);
    }
  };
  
  const handleFlagClick = () => {
    setFlagDialogOpen(true);
  };
  
  const handleFlagSubmit = async () => {
    if (!flagReason.trim()) {
      showToast("Please provide a reason for flagging this content", "error");
      return;
    }
    
    setFlagging(true);
    try {
      await fetch(sanitizeUrl(`/api/notes/${note.id}/flag`), {
        method: "POST",
        body: JSON.stringify({ reason: sanitizeText(flagReason) }),
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      setIsFlagged(true);
      setFlagDialogOpen(false);
      showToast("Content has been flagged for review", "success");
    } catch (error) {
      console.error("Error flagging content:", error);
      showToast("Failed to flag content", "error");
    } finally {
      setFlagging(false);
    }
  };

  // Get the department label from the value
  const getDepartmentLabel = (value: string) => {
    const department = DEPARTMENTS.find(dept => dept.value === value);
    return department ? `${department.label} (${department.code})` : value;
  };

  // Get the subject label from the value
  const getSubjectLabel = (value: string) => {
    const subject = SUBJECTS.find(s => s.value === value);
    return subject ? subject.label : value;
  };

  // Track view when component mounts
  useEffect(() => {
    // Increment view count by calling the API with sanitized URL
    fetch(sanitizeUrl(`/api/notes/${note.id}/view`)).catch(err => {
      console.error("Failed to track view:", err);
    });
  }, [note.id]); // Only run on mount and if note.id changes

  return (
    <div className="relative">
      <div className="file-card bg-card rounded-lg shadow-md overflow-hidden card-hover dark:border dark:border-secondary/40 relative">
        <div className="p-4 border-b border-muted">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-foreground text-gradient">{sanitizeText(note.title)}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {sanitizeText(getDepartmentLabel(note.department))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Subject: {sanitizeText(getSubjectLabel(note.subject))}
              </p>
              {/* View and download counts removed temporarily */}
            </div>
            <FileText className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="px-4 py-3 bg-muted/30 dark:bg-secondary/20 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">USN:</span> 
            <span>{sanitizeText(note.usn || 'Anonymous')}</span>
          </div>
          <div className="flex items-center gap-2">
            {isFlagged ? (
              <div className="flex items-center space-x-1 text-amber-500 text-xs">
                <Check className="h-3 w-3" />
                <span>Reported</span>
              </div>
            ) : (
              <button
                onClick={handleFlagClick}
                className="text-red-500 hover:text-red-600 flex items-center space-x-1 text-xs hover:underline"
                title="Report inappropriate content"
              >
                <Flag className="h-3 w-3" />
                <span className="hidden sm:inline">Report</span>
              </button>
            )}
            <ShareOptions note={note} compact />
            <button 
              onClick={handleDownload}
              className="text-primary hover:text-primary/80 flex items-center space-x-1 text-sm bg-secondary/50 hover:bg-secondary dark:hover:bg-secondary/80 px-2 py-1 rounded-full transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Flag Content Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Inappropriate Content</DialogTitle>
            <DialogDescription>
              Please explain why you're flagging this content. Your report will be reviewed by moderators.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Explain why this content is inappropriate..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleFlagSubmit} 
              disabled={flagging || !flagReason.trim()}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {flagging ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
