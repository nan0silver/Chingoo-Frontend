import { useState, useEffect } from "react";
import LoginPage from "./LoginPage";
import HomePage from "./HomePage";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    } catch (error) {
      console.error("Error removing auth status:", error);
    }
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

  // Render appropriate page based on authentication status
  return (
    <div className="max-w-2xl mx-auto">
      {isLoggedIn ? (
        <HomePage onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}
