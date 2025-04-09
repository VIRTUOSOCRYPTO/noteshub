import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

export function NotificationBell() {
  const { notifications, hasUnreadNotifications, markAllAsRead, markAsRead } = useNotifications();
  const [_, setLocation] = useLocation();
  const [animate, setAnimate] = useState(false);

  // Animate the bell when there are new notifications
  useEffect(() => {
    if (hasUnreadNotifications) {
      // Start animation
      setAnimate(true);
      
      // End animation after 2 seconds
      const timeout = setTimeout(() => {
        setAnimate(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [hasUnreadNotifications, notifications.length]);

  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'note_upload' && notification.metadata?.noteId) {
      // Navigate to the find notes page where the new notes will be visible
      setLocation('/find');
    }
    
    markAsRead(notification.id);
  };

  const emptyNotifications = (
    <div className="py-6 text-center">
      <p className="text-sm text-gray-500">No new notifications</p>
    </div>
  );

  // Add animation class when there are unread notifications
  const bellClass = animate ? 'animate-bounce' : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 ${bellClass}`} />
          {hasUnreadNotifications && (
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="font-medium">Notifications</h2>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length > 0 ? (
          <ScrollArea className="h-80">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full">
                  <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                    {notification.message}
                  </p>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 ml-2 mt-1.5" />
                  )}
                </div>
                <div className="flex justify-between w-full mt-1">
                  <p className="text-xs text-gray-500">
                    {notification.metadata?.userUsn || 'System'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        ) : (
          emptyNotifications
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}