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
import ConnectingCallPage from "./pages/ConnectingCallPage";
import CallConnectedPage from "./pages/CallConnectedPage";
import CallEvaluationPage from "./pages/CallEvaluationPage";
import MyActivityPage from "./pages/MyActivityPage";
import SettingsPage from "./pages/SettingsPage";
import AuthGuard from "./components/AuthGuard";
import { useMatchingStore } from "./lib/matchingStore";
import { CATEGORIES } from "@shared/api";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { categoryId, cancelMatching, resetMatching } = useMatchingStore();

  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    navigate("/");
  };

  // 카테고리 ID를 카테고리 이름으로 변환
  const getCategoryName = (categoryId?: number): string | null => {
    if (!categoryId) return null;
    const category = Object.values(CATEGORIES).find(
      (cat) => cat.id === categoryId,
    );
    return category ? category.name : null;
  };

  const handleCancelMatching = async () => {
    try {
      await cancelMatching();
      navigate("/");
    } catch (error) {
      console.error("매칭 취소 실패:", error);
    }
  };

  const handleConnected = () => {
    navigate("/call-connected");
  };

  const handleEndCall = () => {
    navigate("/call-evaluation");
  };

  const handleCallAgain = () => {
    navigate("/");
  };

  const handleSelectInterests = () => {
    navigate("/");
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleNavigateToActivity = () => {
    navigate("/my-activity");
  };

  const handleNavigateToProfileEdit = () => {
    navigate("/profile-setup");
  };

  const handleLogout = async () => {
    // 로그아웃 로직 구현
    navigate("/login");
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
      <Route
        path="/connecting-call"
        element={
          <AuthGuard>
            <div className="max-w-md mx-auto">
              <ConnectingCallPage
                selectedCategory={getCategoryName(categoryId)}
                onCancel={handleCancelMatching}
                onConnected={handleConnected}
              />
            </div>
          </AuthGuard>
        }
      />
      <Route
        path="/call-connected"
        element={
          <AuthGuard>
            <div className="max-w-md mx-auto">
              <CallConnectedPage
                selectedCategory={getCategoryName(categoryId)}
                onEndCall={handleEndCall}
              />
            </div>
          </AuthGuard>
        }
      />
      <Route
        path="/call-evaluation"
        element={
          <AuthGuard>
            <div className="max-w-md mx-auto">
              <CallEvaluationPage
                selectedCategory={getCategoryName(categoryId)}
                onCallAgain={handleCallAgain}
                onSelectInterests={handleSelectInterests}
              />
            </div>
          </AuthGuard>
        }
      />
      <Route
        path="/my-activity"
        element={
          <AuthGuard>
            <MyActivityPage onBack={handleBack} />
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <SettingsPage
              onBack={handleBack}
              onNavigateToActivity={handleNavigateToActivity}
              onNavigateToProfileEdit={handleNavigateToProfileEdit}
              onLogout={handleLogout}
            />
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
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
