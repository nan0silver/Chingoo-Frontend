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

interface IndexProps {
  isDemoMode?: boolean;
  setIsDemoMode?: (value: boolean) => void;
}

export default function Index({
  isDemoMode: propIsDemoMode = false,
  setIsDemoMode: propSetIsDemoMode,
}: IndexProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(propIsDemoMode);
  const [callState, setCallState] = useState<CallState>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const navigate = useNavigate();

  // Props로 받은 데모 모드 상태를 동기화
  useEffect(() => {
    setIsDemoMode(propIsDemoMode);
    // 데모 모드가 활성화되면 로그인된 상태로 설정
    if (propIsDemoMode) {
      setIsLoggedIn(true);
    }
  }, [propIsDemoMode]);

  // Check authentication status on component mount
  useEffect(() => {
    // 데모 모드일 때는 인증 확인을 건너뛰고 로딩 완료
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }

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
  }, [navigate, isDemoMode]);

  // 비로그인 상태에서는 시연 버튼을 보여주거나 로그인 페이지로 이동
  useEffect(() => {
    if (!isLoading && !isLoggedIn && !isDemoMode) {
      // 시연 모드가 아닌 경우에만 로그인 페이지로 이동
      // navigate("/login", { replace: true });
    }
  }, [isLoading, isLoggedIn, isDemoMode, navigate]);

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

  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    setIsLoggedIn(true); // 시연 모드에서는 로그인된 것처럼 처리
  };

  const handleExitDemoMode = () => {
    setIsDemoMode(false);
    propSetIsDemoMode?.(false);
    setIsLoggedIn(false);
    setCallState("home");
    setSelectedCategory(null);
    setShowSettings(false);
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

  // 비로그인 상태에서 시연 버튼 표시
  if (!isLoading && !isLoggedIn && !isDemoMode) {
    return (
      <div className="max-w-md mx-auto">
        <div className="min-h-screen bg-grey-50 flex items-center justify-center px-8">
          <div className="text-center">
            <div className="mb-8">
              <svg
                width="90"
                height="28"
                viewBox="0 0 90 28"
                fill="none"
                className="mx-auto mb-6"
              >
                <path
                  d="M67.8945 7.44597V4.56752H79.6163V7.44597H75.5525V9.61661C75.5525 10.6076 75.4585 11.4805 75.2706 12.2827C76.3276 13.722 78.7472 15.9634 80.4855 16.8835L79.123 19.8328C77.5726 19.0306 75.4115 17.1431 74.0726 15.2792C73.7907 15.751 73.4853 16.1993 73.1564 16.6712C72.2638 17.9453 70.2671 19.8328 68.9281 20.517L67.0019 17.8037C67.7771 17.4026 69.116 16.3409 70.0557 15.2792C71.5591 13.604 72.1228 12.0232 72.1228 9.73458V7.44597H67.8945ZM81.8244 3.55298H85.2306V10.7963H88.3548V14.0287H85.2306V23.8201H81.8244V3.55298Z"
                  fill="black"
                />
                <path
                  d="M51.7229 10.5604C55.0586 10.5604 57.4781 12.6838 57.4781 15.869C57.4781 19.0542 55.0586 21.154 51.7229 21.154C48.3638 21.154 45.9912 19.0778 45.9912 15.869C45.9912 12.6838 48.3638 10.5604 51.7229 10.5604ZM59.7332 23.8201V3.55296H63.1393V10.985H66.2636V14.2174H63.1393V23.8201H59.7332ZM45.0751 6.4786H50.1255L49.7732 3.48218H53.8371L53.4847 6.4786H58.3472V9.33347H45.0751V6.4786ZM51.7229 13.2029C50.1725 13.2029 49.1155 14.1938 49.1155 15.869C49.1155 17.5677 50.1725 18.5115 51.7229 18.5115C53.2733 18.5115 54.3304 17.5441 54.3304 15.869C54.3304 14.1938 53.2733 13.2029 51.7229 13.2029Z"
                  fill="black"
                />
                <path
                  d="M23.1718 14.4297H35.9507C36.2091 13.368 36.4675 11.6928 36.6319 10.0176C36.7259 9.05028 36.7729 7.87058 36.7963 6.78526H25.5679V3.85962H40.3434C40.3669 6.10104 40.2964 7.89418 40.1085 9.7581C39.8971 11.504 39.4743 13.3444 39.1219 14.4297H43.0683V17.3553H34.8936V24.693H31.2526V17.3553H23.1718V14.4297Z"
                  fill="black"
                />
                <path
                  d="M6.13102 2.93945H10.1009L9.84253 5.36963H13.8594V8.22449H9.81904V8.76715C9.81904 9.3334 9.72508 9.87606 9.56065 10.3951C10.9936 11.4569 13.1077 12.4714 14.3292 12.8253L13.5071 15.7745C11.9802 15.4206 9.70159 14.123 8.19819 12.7781C7.91631 13.132 7.58744 13.4623 7.25857 13.7927C6.01357 14.9959 4.18131 16.0813 2.67791 16.5059L1.57385 13.5331C2.46649 13.2028 3.82895 12.5658 4.74508 11.8108C5.91961 10.8434 6.41291 9.94684 6.41291 8.76715V8.22449H2.16112V5.36963H6.36593L6.13102 2.93945ZM8.40961 17.1194V21.4843H19.92V24.4807H4.95649V17.1194H8.40961ZM16.232 3.5529H19.6381V18.2519H16.232V3.5529Z"
                  fill="black"
                />
              </svg>
            </div>
            <h1 className="text-grey-900 font-crimson text-2xl font-bold mb-4">
              친구하자에 오신 것을 환영합니다!
            </h1>
            <p className="text-grey-600 font-crimson text-lg mb-8">
              백엔드 배포 전 시연을 위해 데모 모드로 체험해보세요
            </p>
            <div className="space-y-4">
              <button
                onClick={handleEnterDemoMode}
                className="w-full h-16 bg-gradient-to-r from-yellow-300 to-red-gradient rounded-lg font-crimson text-xl font-semibold text-white hover:opacity-90 transition-opacity"
              >
                🎯 데모 모드로 체험하기
              </button>
              <button
                onClick={() => navigate("/login")}
                className="w-full h-12 border-2 border-orange-accent text-orange-accent font-crimson text-lg font-semibold rounded-lg hover:bg-orange-accent hover:text-white transition-colors"
              >
                로그인하기
              </button>
            </div>
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
        />
      ) : (
        <HomePage
          onStartCall={handleStartCall}
          onOpenSettings={handleOpenSettings}
          isDemoMode={isDemoMode}
          onExitDemoMode={handleExitDemoMode}
        />
      )}
    </div>
  );
}
