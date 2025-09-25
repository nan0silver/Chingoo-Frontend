import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
  const { categoryId, cancelMatching, resetMatching, status, matchingId } =
    useMatchingStore();
  const previousStatusRef = useRef<string | null>(null);

  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    navigate("/");
  };

  // 매칭 상태 변화 감지하여 자동 페이지 이동
  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    // 이전 상태와 다를 때만 처리 (초기 마운트 시에는 처리하지 않음)
    if (previousStatus !== null && previousStatus !== status) {
      if (status === "matched" && matchingId) {
        // 매칭 성공 시 자동으로 통화 화면으로 이동 (matchingId가 있어야 함)
        console.log("매칭 성공, 통화 화면으로 이동:", { status, matchingId });
        navigate("/call-connected");
      } else if (status === "cancelled" || status === "timeout") {
        // 매칭 취소 또는 타임아웃 시 홈으로 이동
        console.log("매칭 취소/타임아웃, 홈으로 이동:", { status });
        navigate("/");
      }
    }

    // 현재 상태를 이전 상태로 저장
    previousStatusRef.current = status;
  }, [status, matchingId, navigate]);

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
    } catch (error) {
      console.error("매칭 취소 실패:", error);
    } finally {
      // 성공/실패 관계없이 HomePage로 이동
      navigate("/");
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
          <div className="max-w-md mx-auto">
            <LoginPage
              onLogin={() => {}}
              onSignUp={() => {}}
              onEnterDemoMode={handleEnterDemoMode}
            />
          </div>
        }
      />
      <Route
        path="/signup"
        element={
          <div className="max-w-md mx-auto">
            <SignUpPage onBack={() => {}} onSignUp={() => {}} />
          </div>
        }
      />
      <Route
        path="/oauth/callback"
        element={
          <div className="max-w-md mx-auto">
            <OAuthCallbackPage />
          </div>
        }
      />
      <Route
        path="/profile-setup"
        element={
          <AuthGuard>
            <div className="max-w-md mx-auto">
              <ProfileSetupPage />
            </div>
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
            <div className="max-w-md mx-auto">
              <MyActivityPage onBack={handleBack} />
            </div>
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <div className="max-w-md mx-auto">
              <SettingsPage
                onBack={handleBack}
                onNavigateToActivity={handleNavigateToActivity}
                onNavigateToProfileEdit={handleNavigateToProfileEdit}
                onLogout={handleLogout}
              />
            </div>
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
