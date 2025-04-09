import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, X, FileText, Calendar, User, BookOpen } from "lucide-react";
import { showToast } from "@/components/ui/toast-container";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  DEPARTMENTS,
  SUBJECTS 
} from "@/lib/constants";

export default function FlaggedContent() {
  const { user } = useAuth();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  
  const queryClient = useQueryClient();

  // Allow all departments to access this page
  const hasAccess = !!user; // Any authenticated user can access

  // Query to fetch flagged notes
  const { data: flaggedNotes, isLoading, error } = useQuery({
    queryKey: ['/api/notes/flagged'],
    queryFn: async () => {
      if (!hasAccess) return [];
      
      const response = await fetch('/api/notes/flagged');
      if (!response.ok) {
        throw new Error('Failed to fetch flagged content');
      }
      return response.json() as Promise<Note[]>;
    },
    enabled: !!hasAccess
  });

  // Mutation to review a flagged note
  const reviewMutation = useMutation({
    mutationFn: async ({ noteId, approved }: { noteId: number, approved: boolean }) => {
      const response = await fetch(`/api/notes/${noteId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to review note');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the flagged notes query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/notes/flagged'] });
      setReviewDialogOpen(false);
      setSelectedNote(null);
      showToast(
        reviewAction === "approve" 
          ? "Content has been approved and is now publicly available" 
          : "Content has been rejected and removed from the system", 
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(`Error: ${error.message}`, "error");
    }
  });

  // Get department label from value
  const getDepartmentLabel = (value: string) => {
    const department = DEPARTMENTS.find(dept => dept.value === value);
    return department ? department.label : value;
  };

  // Get subject label from value
  const getSubjectLabel = (value: string) => {
    const subject = SUBJECTS.find(s => s.value === value);
    return subject ? subject.label : value;
  };

  // Handle opening the review dialog
  const handleReviewClick = (note: Note, action: "approve" | "reject") => {
    setSelectedNote(note);
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  // Handle submitting the review
  const handleReviewSubmit = async () => {
    if (!selectedNote) return;
    
    await reviewMutation.mutate({ 
      noteId: selectedNote.id, 
      approved: reviewAction === "approve"
    });
  };

  if (!hasAccess) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Restricted Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <AlertTriangle className="text-red-500 h-16 w-16" />
              <p className="text-center text-lg">
                You don't have permission to access this page.
                <br />
                Please log in to access this content.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Content Moderation</CardTitle>
            <CardDescription>
              Review flagged content that has been reported by users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <p>Loading flagged content...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Content Moderation</CardTitle>
            <CardDescription>
              Review flagged content that has been reported by users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <AlertTriangle className="text-red-500 h-16 w-16" />
              <p className="text-center text-lg">
                Error loading flagged content.
                <br />
                Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>
            Review flagged content that has been reported by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedNotes && flaggedNotes.length > 0 ? (
            <div className="space-y-6">
              {flaggedNotes.map((note) => (
                <Card key={note.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{note.title}</CardTitle>
                        <CardDescription>Flagged for review</CardDescription>
                      </div>
                      <div className="bg-secondary/80 p-2 rounded-full">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Uploader</span>
                        </h4>
                        <p className="text-sm ml-6">{note.usn}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>Subject & Department</span>
                        </h4>
                        <p className="text-sm ml-6">
                          {getSubjectLabel(note.subject)} - {getDepartmentLabel(note.department)}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Uploaded</span>
                        </h4>
                        <p className="text-sm ml-6">
                          {format(new Date(note.uploadedAt), 'PPP')}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm text-red-500">
                          Flag Reason:
                        </h4>
                        <p className="text-sm border border-red-200 rounded p-2 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                          {note.flagReason || "No reason provided"}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm">
                          File:
                        </h4>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {note.originalFilename}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/30 flex justify-between">
                    <div>
                      <a 
                        href={`/api/notes/${note.id}/download`}
                        className="text-primary hover:underline text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download file to review
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                        onClick={() => handleReviewClick(note, "approve")}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        onClick={() => handleReviewClick(note, "reject")}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <Check className="text-green-500 h-12 w-12" />
              <p className="text-center text-muted-foreground">
                No flagged content to review.
                <br />
                All reported content has been processed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Review Confirmation Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve Content" : "Reject Content"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? "This content will be marked as reviewed and remain publicly available." 
                : "This content will be permanently removed from the system."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Optional reviewer notes..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReviewSubmit}
              disabled={reviewMutation.isPending}
              className={reviewAction === "approve" 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-red-500 hover:bg-red-600 text-white"}
            >
              {reviewMutation.isPending 
                ? "Processing..." 
                : reviewAction === "approve" 
                  ? "Confirm Approval" 
                  : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}