import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Upload from "@/pages/Upload";
import FindNotes from "@/pages/FindNotes";
import AuthPage from "@/pages/auth-page";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import FlaggedContent from "@/pages/FlaggedContent";
import CorsDebug from "@/pages/CorsDebug";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ToastContainer from "@/components/ui/toast-container";
import NoteBuddy from "@/components/NoteBuddy";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ProtectedRoute } from "@/lib/protected-route";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <ProtectedRoute path="/upload" component={Upload} />
      <ProtectedRoute path="/find" component={FindNotes} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/flagged" component={FlaggedContent} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/cors-debug" component={CorsDebug} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <Switch>
              <Route path="/auth">
                <AuthPage />
              </Route>
              <Route path="/reset-password">
                <ResetPassword />
              </Route>
              <Route>
                <>
                  <Header />
                  <main className="flex-grow">
                    <Router />
                  </main>
                  <Footer />
                </>
              </Route>
            </Switch>
            <ToastContainer />
            <NoteBuddy />
          </div>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
