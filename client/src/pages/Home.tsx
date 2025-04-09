import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Upload, Users, BookText, Lightbulb, AlertTriangle } from "lucide-react";
import HomeShareOptions from "@/components/home/HomeShareOptions";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { usePageVisits } from "@/hooks/use-page-visits";

export default function Home() {
  // Track page visit for App Explorer achievement
  usePageVisits('home');
  
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Only allow certain departments to access moderation (admin departments)
  const allowedDepartments = ['CSE', 'ISE', 'AIML', 'ECE'];
  const hasAccessToModeration = user && allowedDepartments.includes(user.department);
  
  // Query to check if there are any flagged notes to moderate
  const { data: flaggedNotes } = useQuery({
    queryKey: ['/api/notes/flagged'],
    queryFn: async () => {
      if (!hasAccessToModeration) return [];
      
      const response = await fetch('/api/notes/flagged');
      if (!response.ok) {
        return [];
      }
      return response.json() as Promise<Note[]>;
    },
    enabled: !!hasAccessToModeration,
    refetchInterval: 60000 // Refetch every minute
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-50 to-blue-50 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-10">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Share and Access<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  Academic Notes
                </span>
              </h1>
              <p className="text-lg text-gray-700 mb-8">
                A platform for students to share educational resources, collaborate, and access high-quality notes from peers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="px-6"
                  onClick={() => navigate("/find")}
                >
                  <Search className="mr-2 h-5 w-5" />
                  Find Notes
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-6"
                  onClick={() => navigate("/upload")}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Notes
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-lg blur opacity-25"></div>
                <div className="bg-white rounded-lg shadow-xl p-6 md:p-10 relative">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold">Access Notes</h3>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold">Share Resources</h3>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="font-semibold">Collaborate</h3>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                        <Lightbulb className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="font-semibold">Learn Better</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How NotesHub Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Find Notes</h3>
              <p className="text-gray-600">
                Search and filter notes by department, section, and subject. When logged in, you'll automatically see notes from your department.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Share Resources</h3>
              <p className="text-gray-600">
                Upload your notes and study materials to help fellow students and contribute to the knowledge base.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                <BookText className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Access Anywhere</h3>
              <p className="text-gray-600">
                Download and access notes from anywhere, anytime. Study on your own terms and at your own pace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Add a moderation button in the header menu instead */}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-blue-700 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Share Your Knowledge?</h2>
          <p className="text-white text-lg mb-8 max-w-3xl mx-auto">
            Join students across campus in sharing academic resources to help everyone succeed.
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate("/upload")}
            >
              Start Uploading
            </Button>
            <HomeShareOptions />
          </div>
        </div>
      </section>
    </div>
  );
}
