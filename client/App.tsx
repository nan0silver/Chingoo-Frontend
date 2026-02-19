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
import { Layout } from "./components/Layout";
import { CustomSplashScreen } from "./components/CustomSplashScreen";
import { logger } from "@/lib/logger";
import { useMatchingStore } from "./lib/matchingStore";
import { CATEGORIES } from "@shared/api";
import { initializeAuth } from "./lib/auth";
import { useCall } from "./lib/useCall";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();
  const {
    categoryId,
    cancelMatching,
    resetMatching,
    status,
    matchingId,
    restoreMatchingFromStorage,
    restoreMatchingState,
    refreshMatchingStatus,
    connectWebSocket,
  } = useMatchingStore();
  const previousStatusRef = useRef<string | null>(null);
  /** 앱 마운트 시 통화/매칭 복원은 1회만 실행 (effect 재실행 시 중복 호출 방지) */
  const hasRestoreInitializedRef = useRef(false);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  // 웹 환경에서는 스플래시 스크린을 표시하지 않음
  const [showSplash, setShowSplash] = useState(Capacitor.isNativePlatform());

  // 통화 복원을 위한 useCall 훅
  const { restoreCallState } = useCall();

  // 스플래시 스크린에 표시할 아이콘들
  // public 폴더의 파일은 /로 시작하는 절대 경로로 접근합니다
  const splashIcons = [
    "/splash-icons/icon1.png",
    "/splash-icons/icon2.png",
    "/splash-icons/icon3.png",
    "/splash-icons/icon4.png",
    "/splash-icons/icon5.png",
  ];

  // 앱 초기화: refresh token으로 access token 발급 및 통화 상태 복원 (마운트 시 1회만)
  useEffect(() => {
    if (hasRestoreInitializedRef.current) return;
    hasRestoreInitializedRef.current = true;

    const initialize = async () => {
      if (import.meta.env.DEV) {
        logger.log("🚀 앱 시작: 인증 초기화 중...");
      }
      await initializeAuth();
      setIsAuthInitialized(true);

      if (import.meta.env.DEV) {
        logger.log("✅ 인증 초기화 완료");
      }

      // 인증 완료 후 통화 상태 복원 시도 (페이지 새로고침 대응, 30초 이내만)
      try {
        if (import.meta.env.DEV) {
          logger.log("🔄 통화 상태 복원 시도 중...");
        }
        const restoredCategory = await restoreCallState();

        // 통화 상태가 복원되었으면 통화 중 페이지로 이동
        if (restoredCategory !== null) {
          if (import.meta.env.DEV) {
            logger.log("✅ 통화 상태 복원됨 - 통화 중 페이지로 이동", { category: restoredCategory });
          }
          // 약간의 지연 후 페이지 이동 (상태 안정화 대기)
          setTimeout(() => {
            navigate("/call-connected", { replace: true });
          }, 500);
        } else {
          if (import.meta.env.DEV) {
            logger.log("ℹ️ 복원할 통화 정보 없음 또는 만료됨 (30초 초과)");
          }

          // 통화 상태가 복원되지 않았으면 매칭 상태 복원 시도
          try {
            if (import.meta.env.DEV) {
              logger.log("🔄 매칭 상태 복원 시도 중...");
            }
            const restoredMatching = restoreMatchingFromStorage();

            // 매칭 상태가 복원되었으면 매칭 대기 페이지로 이동
            if (restoredMatching !== null && restoredMatching.status === "waiting") {
              if (import.meta.env.DEV) {
                logger.log("✅ 매칭 상태 복원됨 - 매칭 대기 페이지로 이동", restoredMatching);
              }

              // 매칭 상태 복원
              try {
                // 백엔드에서 최신 매칭 상태 조회
                await refreshMatchingStatus();
                if (import.meta.env.DEV) {
                  logger.log("✅ 백엔드에서 매칭 상태 조회 성공");
                }
              } catch (error) {
                logger.warn("매칭 상태 조회 실패, 저장된 정보로 복원:", error);
                // API 호출 실패 시 저장된 정보로만 복원
                restoreMatchingState(restoredMatching);
              }

              // WebSocket 연결 시도
              try {
                await connectWebSocket();
                if (import.meta.env.DEV) {
                  logger.log("✅ WebSocket 재연결 성공");
                }
              } catch (wsError) {
                logger.warn("⚠️ WebSocket 재연결 실패:", wsError);
                // WebSocket 재연결 실패해도 매칭 복원은 계속 진행
              }

              // 약간의 지연 후 페이지 이동 (상태 안정화 대기)
              setTimeout(() => {
                navigate("/connecting-call", { replace: true });
              }, 500);
            } else {
              if (import.meta.env.DEV) {
                logger.log("ℹ️ 복원할 매칭 정보 없음 또는 만료됨 (30초 초과)");
              }
            }
          } catch (error) {
            logger.error("매칭 상태 복원 실패:", error);
            // 복원 실패는 치명적이지 않으므로 계속 진행
          }
        }
      } catch (error) {
        logger.error("통화 상태 복원 실패:", error);
        // 복원 실패는 치명적이지 않으므로 계속 진행
      }
    };

    initialize();
  }, [
    restoreCallState,
    restoreMatchingFromStorage,
    restoreMatchingState,
    refreshMatchingStatus,
    connectWebSocket,
    navigate,
  ]);

  // 스플래시 스크린 완료 핸들러
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // 모바일 OAuth 로그인 성공 이벤트 리스너
  useEffect(() => {
    const handleOAuthLoginSuccess = (event: CustomEvent<{ userInfo: any }>) => {
      const { userInfo } = event.detail;
      if (import.meta.env.DEV) {
        logger.log("✅ 모바일 OAuth 로그인 성공 이벤트 수신:", userInfo);
      }

      // 사용자 정보에 따른 페이지 이동
      // is_new_user가 false인 경우 (기존 유저)는 프로필 완성 여부와 관계없이 메인 페이지로 이동
      if (userInfo.is_new_user) {
        navigate("/profile-setup", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    const handleOAuthLoginError = (event: CustomEvent<{ error: string }>) => {
      const { error } = event.detail;
      if (import.meta.env.DEV) {
        logger.error("❌ 모바일 OAuth 로그인 에러 이벤트 수신:", error);
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
          logger.log("매칭 성공, 통화 화면으로 이동:", { status, matchingId });
        }
        navigate("/call-connected");
      } else if (status === "cancelled" || status === "timeout") {
        // 매칭 취소 또는 타임아웃 시 홈으로 이동
        if (import.meta.env.DEV) {
          logger.log("매칭 취소/타임아웃, 홈으로 이동:", { status });
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
      logger.error("매칭 취소 실패:", error);
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

  // 인증 초기화 중에는 로딩 화면 표시 (Layout 안에서 동일한 앱 영역 유지)
  if (!isAuthInitialized) {
    return (
      <Layout>
        <div className="min-h-full bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={handleGoHome}
              onSignUp={handleNavigateToSignUp}
            />
          }
        />
        <Route
          path="/signup"
          element={<SignUpPage onBack={handleBackToLogin} />}
        />
        <Route
          path="/oauth/callback"
          element={<OAuthCallbackPage />}
        />
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
              <ConnectingCallPage
                selectedCategory={getCategoryName(categoryId)}
                onCancel={handleCancelMatching}
                onConnected={handleConnected}
              />
            </AuthGuard>
          }
        />
        <Route
          path="/call-connected"
          element={
            <AuthGuard>
              <CallConnectedPage
                selectedCategory={getCategoryName(categoryId)}
                onEndCall={handleEndCall}
              />
            </AuthGuard>
          }
        />
        <Route
          path="/call-evaluation"
          element={
            <AuthGuard>
              <CallEvaluationPage
                selectedCategory={getCategoryName(categoryId)}
                onCallAgain={handleCallAgain}
                onSelectInterests={handleSelectInterests}
                onGoHome={handleGoHome}
              />
            </AuthGuard>
          }
        />
        <Route
          path="/my-activity"
          element={
            <AuthGuard>
              <MyActivityPage />
            </AuthGuard>
          }
        />
        <Route
          path="/call-history"
          element={
            <AuthGuard>
              <CallHistoryPage onBack={handleBack} />
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
                onNavigateToComingSoon={handleNavigateToComingSoon}
                onNavigateToSupport={handleNavigateToSupport}
                onLogout={handleLogout}
              />
            </AuthGuard>
          }
        />
        <Route
          path="/coming-soon"
          element={
            <AuthGuard>
              <ComingSoonPage />
            </AuthGuard>
          }
        />
        <Route
          path="/support"
          element={
            <AuthGuard>
              <SupportPage onBack={handleBack} />
            </AuthGuard>
          }
        />
        <Route
          path="/friends"
          element={
            <AuthGuard>
              <FriendsPage
                onBack={handleBackFromFriends}
                onNavigateToRequests={handleNavigateToFriendRequests}
              />
            </AuthGuard>
          }
        />
        <Route
          path="/friends/requests/received"
          element={
            <AuthGuard>
              <FriendRequestsPage
                onBack={handleBackFromFriendRequests}
                onRequestHandled={handleFriendRequestHandled}
              />
            </AuthGuard>
          }
        />
        <Route
          path="/friends/requests/sent"
          element={
            <AuthGuard>
              <FriendRequestsPage
                onBack={handleBackFromFriendRequests}
                onRequestHandled={handleFriendRequestHandled}
              />
            </AuthGuard>
          }
        />
        {/* 기존 라우트 호환성을 위해 유지 (받은 요청으로 리다이렉트) */}
        <Route
          path="/friends/requests"
          element={
            <AuthGuard>
              <FriendRequestsPage
                onBack={handleBackFromFriendRequests}
                onRequestHandled={handleFriendRequestHandled}
              />
            </AuthGuard>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
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
