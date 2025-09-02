import { useState, useEffect } from "react";
import LoginPage from "./LoginPage";
import HomePage from "./HomePage";
import ConnectingCallPage from "./ConnectingCallPage";
import CallConnectedPage from "./CallConnectedPage";
import CallEvaluationPage from "./CallEvaluationPage";

type CallState = "home" | "connecting" | "inCall" | "evaluation";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [callState, setCallState] = useState<CallState>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const authStatus = localStorage.getItem("isLoggedIn");
        setIsLoggedIn(authStatus === "true");
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = () => {
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

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
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
    <div className="max-w-2xl mx-auto">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
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
        <HomePage onLogout={handleLogout} onStartCall={handleStartCall} />
      )}
    </div>
  );
}
