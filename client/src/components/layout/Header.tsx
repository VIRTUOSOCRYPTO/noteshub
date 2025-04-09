import { Link, useLocation } from "wouter";
import { School, Search, Upload, Home as HomeIcon, User, Settings, LogOut, ShieldAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Header() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [initials, setInitials] = useState("");

  useEffect(() => {
    if (user?.usn) {
      // Generate initials from USN - take first two characters
      setInitials(user.usn.substring(0, 2).toUpperCase());
    }
  }, [user]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/");
  };
  
  // Check if user is an admin (based on department)
  const isAdmin = user && ['CSE', 'ISE', 'AIML', 'ECE'].includes(user.department);

  return (
    <header className="bg-gradient-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:justify-between md:items-center">
        <div className="flex items-center space-x-2 mb-3 md:mb-0">
          <School className="h-6 w-6" />
          <Link href="/">
            <h1 className="text-xl font-bold cursor-pointer tracking-tight bg-white rounded-md px-2 py-1 text-primary">NotezHub</h1>
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <nav className="mr-4">
            <div className="flex flex-wrap space-x-2 md:space-x-4">
              <Link href="/">
                <div className={`flex items-center space-x-1 px-3 py-2 rounded transition ${location === '/' ? 'bg-primary/70' : 'hover:bg-primary/70'}`}>
                  <HomeIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </div>
              </Link>
              <Link href="/find">
                <div className={`flex items-center space-x-1 px-3 py-2 rounded transition ${location === '/find' ? 'bg-primary/70' : 'hover:bg-primary/70'}`}>
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Find Notes</span>
                </div>
              </Link>
              <Link href="/upload">
                <div className={`flex items-center space-x-1 px-3 py-2 rounded transition ${location === '/upload' ? 'bg-primary/70' : 'hover:bg-primary/70'}`}>
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload</span>
                </div>
              </Link>
              {isAdmin && (
                <Link href="/flagged">
                  <div className={`flex items-center space-x-1 px-3 py-2 rounded transition ${location === '/flagged' ? 'bg-primary/70' : 'hover:bg-primary/70'}`}>
                    <ShieldAlert className="h-4 w-4" />
                    <span className="hidden sm:inline">Moderation</span>
                  </div>
                </Link>
              )}
            </div>
          </nav>
          
          {user ? (
            <div className="flex items-center space-x-2">
              <NotificationBell />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9 bg-primary hover:bg-primary/80 transition-colors">
                      <AvatarImage 
                        src={user.profilePicture ? `/api/user/profile-picture/${user.profilePicture}` : undefined} 
                        alt={user.usn} 
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{user.usn}</p>
                      <p className="text-xs text-muted-foreground">{user.department}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link href="/auth">
              <Button className="btn-gradient font-medium rounded-full px-6">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
