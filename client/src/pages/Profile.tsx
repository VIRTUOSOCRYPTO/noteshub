import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, School, Building, GraduationCap, Award } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { UserAchievements } from "@/components/badges/UserAchievements";
import { usePageVisits } from "@/hooks/use-page-visits";

export default function Profile() {
  // Track page visit for App Explorer achievement
  usePageVisits('profile');
  
  const { user, isLoading } = useAuth();
  const [initials, setInitials] = useState("US");

  useEffect(() => {
    if (user?.usn) {
      setInitials(user.usn.substring(0, 2).toUpperCase());
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">You need to be logged in to view your profile.</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24 bg-blue-600">
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{user.usn}</CardTitle>
              <CardDescription>College Student</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                <div className="flex items-center">
                  <School className="h-5 w-5 mr-2 text-slate-500" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-slate-500" />
                  <span>{user.college}</span>
                </div>
                <div className="flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2 text-slate-500" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">USN</h3>
                  <p>{user.usn}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Department</h3>
                  <p>{user.department}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-slate-500">College</h3>
                  <p>{user.college}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Account Created</h3>
                  <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Account Status</h3>
                  <Badge className="mt-1" variant="outline">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Your Achievements
              </CardTitle>
              <CardDescription>Track your progress and earn badges as you contribute</CardDescription>
            </CardHeader>
            <CardContent>
              {user && <UserAchievements user={user} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}