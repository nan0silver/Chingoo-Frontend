import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAuthentication, getStoredUserInfo } from "@/lib/auth";
import { UserInfo } from "@shared/api";

interface AuthGuardProps {
  children: React.ReactNode;
  requireProfileComplete?: boolean;
}

export default function AuthGuard({
  children,
  requireProfileComplete = false,
}: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 비동기로 인증 확인 (refresh token으로 토큰 갱신 시도)
        const authenticated = await checkAuthentication();
        const storedUserInfo = getStoredUserInfo();

        if (!authenticated || !storedUserInfo) {
          navigate("/login");
          return;
        }

        setUserInfo(storedUserInfo);

        // 프로필 완성이 필요한 경우 체크
        if (
          requireProfileComplete &&
          (!storedUserInfo.is_profile_complete || storedUserInfo.is_new_user)
        ) {
          navigate("/profile-setup");
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("인증 확인 실패:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate, requireProfileComplete]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-login-button mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

