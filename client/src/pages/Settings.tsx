import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Key, Bell, Eye, EyeOff, Upload, Camera, UserCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showToast } from "@/components/ui/toast-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Settings() {
  // Get user data and loading state
  const { user, isLoading } = useAuth();
  
  // State for form fields
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // State for preferences
  const [notifyNewNotes, setNotifyNewNotes] = useState(false);
  const [notifyDownloads, setNotifyDownloads] = useState(false);
  
  // State for file upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Access query client for cache invalidation
  const queryClient = useQueryClient();

  // Set up settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: { notifyNewNotes?: boolean, notifyDownloads?: boolean }) => {
      return apiRequest(
        'PATCH',
        '/api/user/settings',
        settings
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      showToast('Settings updated successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to update settings: ${error.message}`, 'error');
    }
  });

  // Set up password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }
      
      return apiRequest(
        'PATCH',
        '/api/user/password',
        {
          currentPassword,
          newPassword,
          confirmNewPassword: confirmPassword, // Add this line to match schema requirement
        }
      );
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully', 'success');
    },
    onError: (error) => {
      showToast(`Failed to update password: ${error.message}`, 'error');
    }
  });

  // Handle notification settings save
  function handleSaveNotifications() {
    updateSettingsMutation.mutate({
      notifyNewNotes,
      notifyDownloads,
    });
  }



  // Handle password update
  function handleUpdatePassword() {
    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }
    
    if (!newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    updatePasswordMutation.mutate();
  }

  // Handle profile picture upload
  function handleProfilePictureChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    setIsUploading(true);
    
    fetch('/api/user/profile-picture', {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to upload profile picture');
        return response.json();
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        showToast('Profile picture updated successfully', 'success');
      })
      .catch(error => {
        showToast(`Error: ${error.message}`, 'error');
      })
      .finally(() => {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  }
  
  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      setNotifyNewNotes(user.notifyNewNotes ?? true);
      setNotifyDownloads(user.notifyDownloads ?? false);
    }
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">You need to be logged in to view settings.</h3>
        </div>
      </div>
    );
  }

  // Main settings page
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="account">
        <TabsList className="mb-6">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="profile">Profile Picture</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usn">USN</Label>
                <Input id="usn" defaultValue={user.usn} disabled />
                <p className="text-sm text-slate-500">USN cannot be changed after registration</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" defaultValue={user.department} disabled />
                <p className="text-sm text-slate-500">Department cannot be changed after registration</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="createdAt">Account Created</Label>
                <Input 
                  id="createdAt" 
                  value={new Date(user.createdAt).toLocaleDateString()} 
                  disabled 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input 
                    id="current-password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your current password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your new password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUpdatePassword}
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Update Password"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage your notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-new-notes">New Notes in Department</Label>
                  <p className="text-sm text-slate-500">
                    Receive notifications when new notes are uploaded in your department
                  </p>
                </div>
                <Switch
                  id="notify-new-notes"
                  checked={notifyNewNotes}
                  onCheckedChange={setNotifyNewNotes}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-downloads">Download Notifications</Label>
                  <p className="text-sm text-slate-500">
                    Receive notifications when someone downloads your notes
                  </p>
                </div>
                <Switch
                  id="notify-downloads"
                  checked={notifyDownloads}
                  onCheckedChange={setNotifyDownloads}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveNotifications}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Profile Picture Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={user.profilePicture ? `/api/user/profile-picture/${user.profilePicture}` : undefined} 
                    alt={user.usn} 
                  />
                  <AvatarFallback className="text-xl">
                    {user.usn?.substring(0, 2).toUpperCase() || "UN"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Change Picture
                      </>
                    )}
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                  <p className="text-sm text-slate-500 text-center">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}