import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { processOAuthCallback, getStoredUserInfo } from "@/lib/auth";
import { UserInfo } from "@shared/api";

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const navigate = useNavigate();
  const hasProcessedRef = useRef(false); // 중복 실행 방지

  useEffect(() => {
    // 이미 처리 중이면 중복 실행 방지
    if (hasProcessedRef.current) {
      console.log("⚠️ OAuth 콜백이 이미 처리 중입니다. 중복 실행 방지.");
      return;
    }

    hasProcessedRef.current = true;
    console.log("🚀 OAuth 콜백 처리 시작");

    const handleOAuthCallback = async () => {
      try {
        const result = await processOAuthCallback();

        if (result) {
          console.log("✅ OAuth 콜백 처리 성공");
          console.log("📋 사용자 정보:", {
            is_new_user: result.data.user_info.is_new_user,
            is_profile_complete: result.data.user_info.is_profile_complete,
            id: result.data.user_info.id,
          });
          setStatus("success");
          setUserInfo(result.data.user_info);

          // processSocialLogin에서 이미 localStorage에 저장했지만,
          // 확실하게 하기 위해 여기서도 확인하고 플래그 설정
          // 사용자 정보에 따른 페이지 이동
          const shouldGoToProfileSetup =
            result.data.user_info.is_new_user ||
            !result.data.user_info.is_profile_complete;

          console.log("🔍 페이지 이동 결정:", {
            shouldGoToProfileSetup,
            is_new_user: result.data.user_info.is_new_user,
            is_profile_complete: result.data.user_info.is_profile_complete,
          });

          if (shouldGoToProfileSetup) {
            // 프로필 설정 페이지로 이동
            console.log("➡️ 프로필 설정 페이지로 이동");
            setTimeout(() => {
              navigate("/profile-setup");
            }, 2000);
          } else {
            // 메인 페이지로 이동 - OAuth 콜백에서 온 것을 표시
            // localStorage에 저장된 정보와 일치하는지 확인
            console.log("➡️ 홈 페이지로 이동 (기존 유저)");

            // localStorage에 저장된 사용자 정보 확인 및 동기화
            // processSocialLogin에서 이미 저장했지만, 확실하게 동기화
            const storedUserInfo = getStoredUserInfo();
            console.log(
              "📦 localStorage에 저장된 사용자 정보:",
              storedUserInfo,
            );

            // 저장된 정보가 서버 응답과 일치하는지 확인하고 필요시 업데이트
            if (
              !storedUserInfo ||
              storedUserInfo.is_new_user !==
                result.data.user_info.is_new_user ||
              storedUserInfo.is_profile_complete !==
                result.data.user_info.is_profile_complete
            ) {
              console.warn(
                "⚠️ localStorage 정보가 서버 응답과 불일치 - 업데이트",
              );
              // localStorage 정보 업데이트
              localStorage.setItem(
                "user_info",
                JSON.stringify({
                  id: result.data.user_info.id,
                  is_new_user: result.data.user_info.is_new_user,
                  is_profile_complete:
                    result.data.user_info.is_profile_complete,
                }),
              );
              console.log("✅ localStorage 사용자 정보 업데이트 완료");
            }

            // OAuth 콜백 처리 플래그를 즉시 설정 (Index.tsx에서 프로필 체크 스킵)
            // setTimeout 전에 설정하여 Index.tsx가 실행될 때 플래그가 이미 존재하도록 함
            sessionStorage.setItem("oauth_callback_processed", "true");
            console.log(
              "✅ oauth_callback_processed 플래그 설정 완료 (즉시 설정)",
            );

            setTimeout(() => {
              navigate("/", { replace: true });
            }, 2000);
          }
        } else {
          // OAuth 콜백이 아닌 경우 메인 페이지로 리다이렉트
          console.log("ℹ️ OAuth 콜백 파라미터 없음, 홈으로 이동");
          navigate("/");
        }
      } catch (error) {
        console.error("❌ OAuth 콜백 처리 실패:", error);
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

    // Cleanup 함수: 컴포넌트 언마운트 시 실행
    return () => {
      console.log("🧹 OAuth 콜백 페이지 cleanup");
      // 여기서는 특별히 할 일이 없지만, 필요시 타이머 정리 등 가능
    };
  }, []); // navigate를 의존성에서 제거 (한 번만 실행)

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center safe-area-page font-noto">
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center safe-area-page font-noto">
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
            안녕하세요! 로그인이 완료되었습니다.
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center safe-area-page font-noto">
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
