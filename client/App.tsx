import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    navigate("/");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Index isDemoMode={isDemoMode} setIsDemoMode={setIsDemoMode} />
        }
      />
      <Route
        path="/login"
        element={
          <LoginPage
            onLogin={() => {}}
            onSignUp={() => {}}
            onEnterDemoMode={handleEnterDemoMode}
          />
        }
      />
      <Route
        path="/signup"
        element={<SignUpPage onBack={() => {}} onSignUp={() => {}} />}
      />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/profile-setup"
        element={
          <AuthGuard>
            <ProfileSetupPage />
          </AuthGuard>
        }
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
