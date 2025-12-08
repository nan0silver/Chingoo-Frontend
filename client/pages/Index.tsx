import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getStoredUserInfo, logout } from "@/lib/auth";
import HomePage from "./HomePage";
import ConnectingCallPage from "./ConnectingCallPage";
import CallConnectedPage from "./CallConnectedPage";
import CallEvaluationPage from "./CallEvaluationPage";
import SettingsPage from "./SettingsPage";
import MyActivityPage from "./MyActivityPage";
import CallHistoryPage from "./CallHistoryPage";
import ComingSoonPage from "./ComingSoonPage";
import SupportPage from "./SupportPage";
import FriendsPage from "./FriendsPage";
import FriendRequestsPage from "./FriendRequestsPage";

type CallState = "home" | "connecting" | "inCall" | "evaluation";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [callState, setCallState] = useState<CallState>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const [showCallHistory, setShowCallHistory] = useState<boolean>(false);
  const [showComingSoon, setShowComingSoon] = useState<boolean>(false);
  const [showSupport, setShowSupport] = useState<boolean>(false);
  const [showFriends, setShowFriends] = useState<boolean>(false);
  const [showFriendRequests, setShowFriendRequests] = useState<boolean>(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<string>("");
  const navigate = useNavigate();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const authenticated = isAuthenticated();
        const userInfo = getStoredUserInfo();

        console.log("🔍 Index.tsx - 인증 상태 확인:", {
          authenticated,
          hasUserInfo: !!userInfo,
          userInfo: userInfo ? {
            is_new_user: userInfo.is_new_user,
            is_profile_complete: userInfo.is_profile_complete,
            id: userInfo.id,
          } : null,
        });

        setIsLoggedIn(authenticated);

        // OAuth 콜백에서 처리된 경우 프로필 체크를 스킵
        const oauthCallbackProcessed = sessionStorage.getItem("oauth_callback_processed");
        console.log("🔍 OAuth 콜백 플래그 확인:", oauthCallbackProcessed);
        
        if (oauthCallbackProcessed === "true") {
          sessionStorage.removeItem("oauth_callback_processed");
          console.log("✅ OAuth 콜백에서 이미 처리됨 - 프로필 체크 스킵");
          setIsLoading(false);
          return;
        }

        // OAuth 인증된 사용자의 경우 프로필 완성도에 따라 리다이렉트
        if (authenticated && userInfo) {
          console.log("📋 인증된 사용자 정보:", {
            is_new_user: userInfo.is_new_user,
            is_profile_complete: userInfo.is_profile_complete,
            id: userInfo.id,
          });

          const shouldRedirectToProfile =
            userInfo.is_new_user || !userInfo.is_profile_complete;

          console.log("🔍 프로필 리다이렉트 결정:", {
            shouldRedirectToProfile,
            is_new_user: userInfo.is_new_user,
            is_profile_complete: userInfo.is_profile_complete,
          });

          if (shouldRedirectToProfile) {
            console.log("➡️ 프로필 설정 페이지로 리다이렉트");
            navigate("/profile-setup", { replace: true });
            return;
          } else {
            console.log("✅ 프로필 완성된 사용자 - 메인 페이지에 머물기");
            // 프로필이 완성된 사용자는 메인 페이지에 머물도록 함
            return;
          }
        }
      } catch (error) {
        console.error("❌ Error checking auth status:", error);
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

  const handleNavigateToCallHistory = () => {
    setShowCallHistory(true);
  };

  const handleNavigateToProfileEdit = () => {
    setShowSettings(false);
    navigate("/profile-setup");
  };

  const handleBackFromActivity = () => {
    setShowActivity(false);
  };

  const handleBackFromCallHistory = () => {
    setShowCallHistory(false);
  };

  const handleNavigateToComingSoon = (featureName: string) => {
    setComingSoonFeature(featureName);
    setShowComingSoon(true);
    setShowSettings(false);
  };

  const handleBackFromComingSoon = () => {
    setShowComingSoon(false);
    setShowSettings(true);
  };

  const handleNavigateToSupport = () => {
    setShowSupport(true);
    setShowSettings(false);
  };

  const handleBackFromSupport = () => {
    setShowSupport(false);
    setShowSettings(true);
  };

  const handleNavigateToFriends = () => {
    setShowFriends(true);
  };

  const handleBackFromFriends = () => {
    setShowFriends(false);
  };

  const handleNavigateToFriendRequests = () => {
    setShowFriendRequests(true);
  };

  const handleBackFromFriendRequests = () => {
    setShowFriendRequests(false);
  };

  const handleFriendRequestHandled = () => {
    // 친구 요청 처리 후 친구 목록 새로고침을 위해 FriendsPage로 이동
    setShowFriendRequests(false);
    setShowFriends(true);
  };

  const handleNavigateToProfile = () => {
    setShowSettings(true);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto">
        <div className="min-h-screen bg-grey-50 flex items-center justify-center safe-area-page">
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
      {!isLoggedIn ? null : showSupport ? (
        <SupportPage onBack={handleBackFromSupport} />
      ) : showComingSoon ? (
        <ComingSoonPage
          featureName={comingSoonFeature}
          onBack={handleBackFromComingSoon}
        />
      ) : showFriendRequests ? (
        <FriendRequestsPage
          onBack={handleBackFromFriendRequests}
          onRequestHandled={handleFriendRequestHandled}
        />
      ) : showFriends ? (
        <FriendsPage
          onBack={handleBackFromFriends}
          onNavigateToRequests={handleNavigateToFriendRequests}
        />
      ) : showCallHistory ? (
        <CallHistoryPage onBack={handleBackFromCallHistory} />
      ) : showActivity ? (
        <MyActivityPage onBack={handleBackFromActivity} />
      ) : showSettings ? (
        <SettingsPage
          onBack={handleCloseSettings}
          onNavigateToActivity={handleNavigateToActivity}
          onNavigateToProfileEdit={handleNavigateToProfileEdit}
          onNavigateToComingSoon={handleNavigateToComingSoon}
          onNavigateToSupport={handleNavigateToSupport}
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
          onOpenCallHistory={handleNavigateToCallHistory}
          onNavigateToFriends={handleNavigateToFriends}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
    </div>
  );
}
