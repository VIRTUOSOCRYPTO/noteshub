import { useState, useEffect, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

export type Notification = {
  id: string;
  message: string;
  read: boolean;
  createdAt: Date;
  type: 'note_upload' | 'download' | 'system';
  metadata?: {
    noteId?: number;
    noteTitle?: string;
    userId?: number;
    userUsn?: string;
  };
};

// Time window to check for new notes (last 24 hours)
const NEW_NOTES_TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Store the IDs of notes we've already notified about so we don't notify twice
const NOTIFIED_NOTES_KEY = 'notifiedNoteIds';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notifiedNoteIds, setNotifiedNoteIds] = useState<number[]>([]);

  // Load already notified note IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFIED_NOTES_KEY);
      if (stored) {
        setNotifiedNoteIds(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notified notes from localStorage:', error);
    }
  }, []);

  // Save notified note IDs to localStorage, but keep only the last 100 to prevent storage bloat
  useEffect(() => {
    if (notifiedNoteIds.length > 0) {
      // Keep only the most recent 100 note IDs to prevent localStorage from filling up
      const limitedIds = notifiedNoteIds.slice(-100);
      localStorage.setItem(NOTIFIED_NOTES_KEY, JSON.stringify(limitedIds));
      
      // If we truncated the list, update the state as well
      if (limitedIds.length < notifiedNoteIds.length) {
        setNotifiedNoteIds(limitedIds);
      }
    }
  }, [notifiedNoteIds]);

  // This query will constantly check for new notes
  // Refetching automatically when the user comes back to the tab
  const { data: notes } = useQuery<any[]>({
    queryKey: ['/api/notes', 'notifications', user?.department],
    queryFn: async () => {
      // Only fetch if we have a user
      if (!user || !user.department) return [];
      
      // Use the query with the user's specific department to get only department-specific notes
      const response = await fetch(`/api/notes?department=${user.department}&showAllDepartments=false&showAllYears=false`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return response.json();
    },
    enabled: !!user && !!user.department,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000, // 1 minute
  });

  // Check for new notes in the fetched data
  const checkForNewNotes = useCallback(() => {
    if (!user || !notes || !notes.length) return;

    try {
      console.log('Checking for new notes, total notes:', notes.length);
      
      // Filter by notes uploaded in the last 24 hours
      // Also filter out notes uploaded by the current user
      // And filter out notes we've already notified about
      const recentNotes = notes.filter(note => {
        // Make sure we have uploadedAt data
        if (!note.uploadedAt) return false;
        
        // Convert uploadedAt to Date object if it's a string
        const uploadTime = typeof note.uploadedAt === 'string' 
          ? new Date(note.uploadedAt).getTime() 
          : note.uploadedAt.getTime();
        
        const currentTime = new Date().getTime();
        
        // Debug for recent notes being evaluated
        if (currentTime - uploadTime < NEW_NOTES_TIME_WINDOW) {
          console.log('Recent note:', note.id, note.title, 'by', note.usn);
        }
        
        return (
          note.userId !== user.id && 
          currentTime - uploadTime < NEW_NOTES_TIME_WINDOW &&
          !notifiedNoteIds.includes(note.id)
        );
      });

      console.log('Recent notes that need notifications:', recentNotes.length);

      if (recentNotes.length > 0) {
        // Create notifications for each new note
        const noteNotifications: Notification[] = recentNotes.map(note => ({
          id: `note-${note.id}`,
          message: `New ${user.department} notes: ${note.title}`,
          read: false,
          createdAt: new Date(note.uploadedAt),
          type: 'note_upload',
          metadata: {
            noteId: note.id,
            noteTitle: note.title,
            userId: note.userId,
            userUsn: note.usn
          }
        }));

        // Add these note IDs to our notified list
        setNotifiedNoteIds(prev => [...prev, ...recentNotes.map(note => note.id)]);
        
        // Update notifications by adding new ones to existing ones
        setNotifications(prev => [...noteNotifications, ...prev]);
        setHasUnreadNotifications(true);
      }
    } catch (error) {
      console.error('Error checking for new notes:', error);
    }
  }, [user, notes, notifiedNoteIds]);

  // Run the check when notes data changes
  useEffect(() => {
    checkForNewNotes();
  }, [checkForNewNotes]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setHasUnreadNotifications(false);
  };

  // Mark a specific notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    // Check if there are still unread notifications
    setHasUnreadNotifications(
      notifications.some(notification => 
        notification.id !== notificationId && !notification.read
      )
    );
  };

  return {
    notifications,
    hasUnreadNotifications,
    markAllAsRead,
    markAsRead
  };
}