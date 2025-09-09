import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getStoredUserInfo } from "@/lib/auth";
import LoginPage from "./LoginPage";
import HomePage from "./HomePage";
import ConnectingCallPage from "./ConnectingCallPage";
import CallConnectedPage from "./CallConnectedPage";
import CallEvaluationPage from "./CallEvaluationPage";
import SettingsPage from "./SettingsPage";
import MyActivityPage from "./MyActivityPage";
import SignUpPage from "./SignUpPage";

type CallState = "home" | "connecting" | "inCall" | "evaluation";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [callState, setCallState] = useState<CallState>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const [showSignUp, setShowSignUp] = useState<boolean>(false);
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
          console.log("인증된 사용자 정보:", {
            is_new_user: userInfo.is_new_user,
            is_profile_complete: userInfo.is_profile_complete,
            nickname: userInfo.nickname,
          });

          if (userInfo.is_new_user || !userInfo.is_profile_complete) {
            console.log("프로필 설정 페이지로 리다이렉트");
            navigate("/profile-setup");
            return;
          } else {
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

  const handleLogin = () => {
    // OAuth 로그인은 별도 페이지에서 처리되므로 여기서는 기본 로그인만 처리
    try {
      localStorage.setItem("isLoggedIn", "true");
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error saving auth status:", error);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("isLoggedIn");
      setIsLoggedIn(false);
      setCallState("home");
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error removing auth status:", error);
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

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleNavigateToActivity = () => {
    setShowActivity(true);
  };

  const handleBackFromActivity = () => {
    setShowActivity(false);
  };

  const handleShowSignUp = () => {
    setShowSignUp(true);
  };

  const handleBackFromSignUp = () => {
    setShowSignUp(false);
  };

  const handleSignUp = () => {
    // For demo purposes, signing up logs the user in
    setShowSignUp(false);
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");
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
      {!isLoggedIn ? (
        showSignUp ? (
          <SignUpPage onBack={handleBackFromSignUp} onSignUp={handleSignUp} />
        ) : (
          <LoginPage onLogin={handleLogin} onSignUp={handleShowSignUp} />
        )
      ) : showActivity ? (
        <MyActivityPage onBack={handleBackFromActivity} />
      ) : showSettings ? (
        <SettingsPage
          onBack={handleCloseSettings}
          onNavigateToActivity={handleNavigateToActivity}
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
        />
      ) : (
        <HomePage
          onLogout={handleLogout}
          onStartCall={handleStartCall}
          onOpenSettings={handleOpenSettings}
        />
      )}
    </div>
  );
}
