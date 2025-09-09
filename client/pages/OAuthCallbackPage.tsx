import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { processOAuthCallback } from "@/lib/auth";
import { UserInfo } from "@shared/api";

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const result = await processOAuthCallback();

        if (result) {
          setStatus("success");
          setUserInfo(result.data.user_info);

          // 사용자 정보에 따른 페이지 이동
          if (
            result.data.user_info.is_new_user ||
            !result.data.user_info.is_profile_complete
          ) {
            // 프로필 설정 페이지로 이동
            setTimeout(() => {
              navigate("/profile-setup");
            }, 2000);
          } else {
            // 메인 페이지로 이동
            setTimeout(() => {
              navigate("/");
            }, 2000);
          }
        } else {
          // OAuth 콜백이 아닌 경우 메인 페이지로 리다이렉트
          navigate("/");
        }
      } catch (error) {
        console.error("OAuth 콜백 처리 실패:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "로그인 처리 중 오류가 발생했습니다.",
        );

        // 에러 발생 시 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-login-button mx-auto mb-4"></div>
          <h2 className="text-xl font-crimson text-gray-900 mb-2">
            로그인 처리 중...
          </h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-crimson text-gray-900 mb-2">
            로그인 성공!
          </h2>
          <p className="text-gray-600 mb-4">
            안녕하세요, {userInfo?.nickname}님!
          </p>
          <p className="text-sm text-gray-500">
            {userInfo?.is_new_user || !userInfo?.is_profile_complete
              ? "프로필 설정 페이지로 이동합니다..."
              : "메인 페이지로 이동합니다..."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-crimson text-gray-900 mb-2">
            로그인 실패
          </h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <p className="text-sm text-gray-500">로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return null;
}
