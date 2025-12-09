import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";
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
import CallHistoryPage from "./pages/CallHistoryPage";
import SettingsPage from "./pages/SettingsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import SupportPage from "./pages/SupportPage";
import FriendsPage from "./pages/FriendsPage";
import FriendRequestsPage from "./pages/FriendRequestsPage";
import AuthGuard from "./components/AuthGuard";
import { CustomSplashScreen } from "./components/CustomSplashScreen";
import { useMatchingStore } from "./lib/matchingStore";
import { CATEGORIES } from "@shared/api";
import { initializeAuth } from "./lib/auth";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();
  const { categoryId, cancelMatching, resetMatching, status, matchingId } =
    useMatchingStore();
  const previousStatusRef = useRef<string | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  // 웹 환경에서는 스플래시 스크린을 표시하지 않음
  const [showSplash, setShowSplash] = useState(Capacitor.isNativePlatform());

  // 스플래시 스크린에 표시할 아이콘들
  // public 폴더의 파일은 /로 시작하는 절대 경로로 접근합니다
  const splashIcons = [
    "/splash-icons/icon1.png",
    "/splash-icons/icon2.png",
    "/splash-icons/icon3.png",
    "/splash-icons/icon4.png",
    "/splash-icons/icon5.png",
  ];

  // 앱 초기화: refresh token으로 access token 발급
  useEffect(() => {
    const initialize = async () => {
      if (import.meta.env.DEV) {
        console.log("🚀 앱 시작: 인증 초기화 중...");
      }
      await initializeAuth();
      setIsAuthInitialized(true);

      if (import.meta.env.DEV) {
        console.log("✅ 인증 초기화 완료");
      }
    };

    initialize();
  }, []);

  // 스플래시 스크린 완료 핸들러
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // 모바일 OAuth 로그인 성공 이벤트 리스너
  useEffect(() => {
    const handleOAuthLoginSuccess = (event: CustomEvent<{ userInfo: any }>) => {
      const { userInfo } = event.detail;
      if (import.meta.env.DEV) {
        console.log("✅ 모바일 OAuth 로그인 성공 이벤트 수신:", userInfo);
      }

      // 사용자 정보에 따른 페이지 이동
      if (userInfo.is_new_user || !userInfo.is_profile_complete) {
        navigate("/profile-setup", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    const handleOAuthLoginError = (event: CustomEvent<{ error: string }>) => {
      const { error } = event.detail;
      if (import.meta.env.DEV) {
        console.error("❌ 모바일 OAuth 로그인 에러 이벤트 수신:", error);
      }
      navigate("/login", { replace: true });
    };

    window.addEventListener(
      "oauth-login-success",
      handleOAuthLoginSuccess as EventListener,
    );
    window.addEventListener(
      "oauth-login-error",
      handleOAuthLoginError as EventListener,
    );

    return () => {
      window.removeEventListener(
        "oauth-login-success",
        handleOAuthLoginSuccess as EventListener,
      );
      window.removeEventListener(
        "oauth-login-error",
        handleOAuthLoginError as EventListener,
      );
    };
  }, [navigate]);

  // 매칭 상태 변화 감지하여 자동 페이지 이동
  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    // 이전 상태와 다를 때만 처리 (초기 마운트 시에는 처리하지 않음)
    if (previousStatus !== null && previousStatus !== status) {
      if (status === "matched" && matchingId) {
        // 매칭 성공 시 자동으로 통화 화면으로 이동 (matchingId가 있어야 함)
        if (import.meta.env.DEV) {
          console.log("매칭 성공, 통화 화면으로 이동:", { status, matchingId });
        }
        navigate("/call-connected");
      } else if (status === "cancelled" || status === "timeout") {
        // 매칭 취소 또는 타임아웃 시 홈으로 이동
        if (import.meta.env.DEV) {
          console.log("매칭 취소/타임아웃, 홈으로 이동:", { status });
        }
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

  const handleNavigateToCallHistory = () => {
    navigate("/call-history");
  };

  const handleNavigateToSignUp = () => {
    navigate("/signup");
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  const handleNavigateToProfileEdit = () => {
    navigate("/profile-setup");
  };

  const handleNavigateToComingSoon = (featureName: string) => {
    navigate(`/coming-soon?feature=${encodeURIComponent(featureName)}`);
  };

  const handleNavigateToSupport = () => {
    navigate("/support");
  };

  const handleNavigateToFriends = () => {
    navigate("/friends");
  };

  const handleNavigateToFriendRequests = () => {
    navigate("/friends/requests");
  };

  const handleBackFromFriends = () => {
    navigate("/");
  };

  const handleBackFromFriendRequests = () => {
    navigate("/friends");
  };

  const handleFriendRequestHandled = () => {
    // 친구 요청 처리 후 친구 목록으로 이동
    navigate("/friends");
  };

  const handleLogout = async () => {
    // 로그아웃 로직 구현
    navigate("/login");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  // 스플래시 스크린 표시 (인증 초기화 완료 후에도 스플래시가 끝날 때까지 표시)
  if (showSplash) {
    return (
      <CustomSplashScreen
        onComplete={handleSplashComplete}
        icons={splashIcons}
        iconDuration={400} // 각 아이콘 표시 시간 (밀리초)
        minDisplayDuration={2000} // 최소 표시 시간 (밀리초)
        animationType="slide-up" // 애니메이션 타입: 'slide-up' | 'fade' | 'none'
        backgroundColor="#ffffff" // 배경색
      />
    );
  }

  // 인증 초기화 중에는 로딩 화면 표시
  if (!isAuthInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen max-w-md mx-auto bg-white relative overflow-x-hidden">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route
          path="/login"
          element={
            <div className="max-w-md mx-auto">
              <LoginPage
                onLogin={handleGoHome}
                onSignUp={handleNavigateToSignUp}
              />
            </div>
          }
        />
        <Route
          path="/signup"
          element={
            <div className="max-w-md mx-auto">
              <SignUpPage onBack={handleBackToLogin} />
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
                  onGoHome={handleGoHome}
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
          path="/call-history"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <CallHistoryPage onBack={handleBack} />
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
                  onNavigateToComingSoon={handleNavigateToComingSoon}
                  onNavigateToSupport={handleNavigateToSupport}
                  onLogout={handleLogout}
                />
              </div>
            </AuthGuard>
          }
        />
        <Route
          path="/coming-soon"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <ComingSoonPage />
              </div>
            </AuthGuard>
          }
        />
        <Route
          path="/support"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <SupportPage onBack={handleBack} />
              </div>
            </AuthGuard>
          }
        />
        <Route
          path="/friends"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <FriendsPage
                  onBack={handleBackFromFriends}
                  onNavigateToRequests={handleNavigateToFriendRequests}
                />
              </div>
            </AuthGuard>
          }
        />
        <Route
          path="/friends/requests/received"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <FriendRequestsPage
                  onBack={handleBackFromFriendRequests}
                  onRequestHandled={handleFriendRequestHandled}
                />
              </div>
            </AuthGuard>
          }
        />
        <Route
          path="/friends/requests/sent"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <FriendRequestsPage
                  onBack={handleBackFromFriendRequests}
                  onRequestHandled={handleFriendRequestHandled}
                />
              </div>
            </AuthGuard>
          }
        />
        {/* 기존 라우트 호환성을 위해 유지 (받은 요청으로 리다이렉트) */}
        <Route
          path="/friends/requests"
          element={
            <AuthGuard>
              <div className="max-w-md mx-auto">
                <FriendRequestsPage
                  onBack={handleBackFromFriendRequests}
                  onRequestHandled={handleFriendRequestHandled}
                />
              </div>
            </AuthGuard>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
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
