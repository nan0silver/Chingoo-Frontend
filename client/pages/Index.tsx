import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getStoredUserInfo, logout } from "@/lib/auth";
import HomePage from "./HomePage";
import ConnectingCallPage from "./ConnectingCallPage";
import CallConnectedPage from "./CallConnectedPage";
import CallEvaluationPage from "./CallEvaluationPage";
import SettingsPage from "./SettingsPage";
import MyActivityPage from "./MyActivityPage";

type CallState = "home" | "connecting" | "inCall" | "evaluation";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [callState, setCallState] = useState<CallState>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const navigate = useNavigate();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const authenticated = isAuthenticated();
        const userInfo = getStoredUserInfo();

        setIsLoggedIn(authenticated);

        // OAuth 인증된 사용자의 경우 프로필 완성도에 따라 리다이렉트
        if (authenticated && userInfo) {
          if (import.meta.env.DEV) {
            console.log("인증된 사용자 정보:", {
              is_new_user: userInfo.is_new_user,
              is_profile_complete: userInfo.is_profile_complete,
            });
          }

          if (userInfo.is_new_user || !userInfo.is_profile_complete) {
            if (import.meta.env.DEV)
              console.log("프로필 설정 페이지로 리다이렉트");
            navigate("/profile-setup", { replace: true });
            return;
          } else {
            if (import.meta.env.DEV)
              console.log("프로필 완성된 사용자 - 메인 페이지에 머물기");
            // 프로필이 완성된 사용자는 메인 페이지에 머물도록 함
            return;
          }
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [navigate]);

  // 비로그인 상태에서는 로그인 페이지로 이동
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, isLoggedIn, navigate]);

  const handleLogout = async () => {
    try {
      // OAuth 로그아웃 함수 호출
      await logout();

      // 로컬 상태 초기화
      setIsLoggedIn(false);
      setCallState("home");
      setSelectedCategory(null);
      setShowSettings(false);
      setShowActivity(false);

      // 로그인 페이지로 리다이렉트
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      // 에러가 발생해도 로컬 상태는 초기화하고 로그인 페이지로 이동
      setIsLoggedIn(false);
      setCallState("home");
      setSelectedCategory(null);
      setShowSettings(false);
      setShowActivity(false);
      navigate("/login", { replace: true });
    }
  };

  const handleStartCall = (category: string) => {
    setSelectedCategory(category);
    setCallState("connecting");
  };

  const handleCancelCall = () => {
    setCallState("home");
    setSelectedCategory(null);
  };

  const handleCallConnected = () => {
    setCallState("inCall");
  };

  const handleEndCall = () => {
    setCallState("evaluation");
  };

  const handleCallAgain = () => {
    setCallState("connecting");
  };

  const handleSelectInterests = () => {
    setCallState("home");
    setSelectedCategory(null);
  };

  const handleGoHome = () => {
    setCallState("home");
    setSelectedCategory(null);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleNavigateToActivity = () => {
    setShowActivity(true);
  };

  const handleNavigateToProfileEdit = () => {
    setShowSettings(false);
    navigate("/profile-setup");
  };

  const handleBackFromActivity = () => {
    setShowActivity(false);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto">
        <div className="min-h-screen bg-grey-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-orange-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-grey-900 font-crimson text-lg">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate page based on authentication status and call state
  return (
    <div className="max-w-md mx-auto">
      {!isLoggedIn ? null : showActivity ? (
        <MyActivityPage onBack={handleBackFromActivity} />
      ) : showSettings ? (
        <SettingsPage
          onBack={handleCloseSettings}
          onNavigateToActivity={handleNavigateToActivity}
          onNavigateToProfileEdit={handleNavigateToProfileEdit}
          onLogout={handleLogout}
        />
      ) : callState === "connecting" ? (
        <ConnectingCallPage
          selectedCategory={selectedCategory}
          onCancel={handleCancelCall}
          onConnected={handleCallConnected}
        />
      ) : callState === "inCall" ? (
        <CallConnectedPage
          selectedCategory={selectedCategory}
          onEndCall={handleEndCall}
        />
      ) : callState === "evaluation" ? (
        <CallEvaluationPage
          selectedCategory={selectedCategory}
          onCallAgain={handleCallAgain}
          onSelectInterests={handleSelectInterests}
          onGoHome={handleGoHome}
        />
      ) : (
        <HomePage
          onStartCall={handleStartCall}
          onOpenSettings={handleOpenSettings}
        />
      )}
    </div>
  );
}
