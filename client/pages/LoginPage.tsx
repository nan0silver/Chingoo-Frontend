import { useState } from "react";
import { startSocialLogin, login } from "@/lib/auth";
import { OAuthProvider, LoginRequest } from "@shared/api";
import { logger } from "@/lib/logger";
import { Eye, EyeOff } from "lucide-react";

interface LoginPageProps {
  onLogin: () => void;
  onSignUp: () => void;
}

export default function LoginPage({ onLogin, onSignUp }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // 유효성 검사
    if (!email.trim()) {
      alert("이메일을 입력해주세요.");
      return;
    }

    if (!password.trim()) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const loginData: LoginRequest = {
        email: email.trim(),
        password,
      };

      // auth.ts의 login 함수 사용
      await login(loginData);

      // 로그인 성공 - 메인 페이지로 이동
      onLogin();
    } catch (error) {
      logger.error("로그인 오류:", error);
      // 에러 메시지를 팝업 알림으로 표시
      const errorMessage =
        error instanceof Error
          ? error.message
          : "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: OAuthProvider) => {
    try {
      await startSocialLogin(provider);
    } catch (error) {
      logger.error("소셜 로그인 시작 실패:", error);
      alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center safe-area-page">
      {/* Logo */}
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-3xl font-bold text-black font-cafe24">
          강낭콩콜
        </h1>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-app px-5 space-y-4 md:space-y-6">
        {/* Email Input */}
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력해주세요."
            className="w-full h-12 md:h-14 px-4 border border-border-gray rounded-lg font-noto text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력해주세요."
            className="w-full h-12 md:h-14 px-4 pr-12 border border-border-gray rounded-lg font-noto text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent"
            disabled={isLoading}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleLogin();
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <Eye className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </button>
        </div>

        {/* Login Button */}
        <div className="pt-4">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full h-14 md:h-16 bg-login-button text-white font-noto text-xl md:text-2xl font-bold rounded-lg hover:bg-opacity-90 transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={onSignUp}
            className="text-text-gray font-pretendard text-lg md:text-xl underline hover:text-gray-600"
          >
            회원가입
          </button>
          <div className="w-px h-4 bg-divider"></div>
          <button className="text-text-gray font-pretendard text-lg md:text-xl underline hover:text-gray-600">
            비밀번호 찾기
          </button>
        </div>

        {/* Social Login Divider */}
        <div className="flex items-center justify-center pt-8 pb-4">
          <div className="flex-1 h-px bg-border-gray"></div>
          <span className="px-4 text-text-gray font-noto text-base md:text-lg">
            간편 로그인
          </span>
          <div className="flex-1 h-px bg-border-gray"></div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3">
          {/* Kakao Button */}
          <button
            onClick={() => handleSocialLogin("kakao")}
            className="w-full h-12 md:h-14 bg-kakao border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
          >
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/4c65144d6cea6e4262f91c38a6a5875303193496?width=48"
              alt="Kakao"
              className="w-6 h-6"
            />
            <span className="text-gray-800 font-noto text-base md:text-lg font-bold">
              카카오로 로그인
            </span>
          </button>

          {/* Google Button */}
          <button
            onClick={() => handleSocialLogin("google")}
            className="w-full h-12 md:h-14 bg-white border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M11.9977 10.3621V13.8467H16.8402C16.6276 14.9674 15.9895 15.9163 15.0324 16.5543L17.9527 18.8202C19.6541 17.2497 20.6357 14.9429 20.6357 12.2026C20.6357 11.5646 20.5785 10.9511 20.4721 10.3622L11.9977 10.3621Z"
                fill="#4285F4"
              />
              <path
                d="M6.95517 13.7107L6.29655 14.2149L3.96521 16.0308C5.44578 18.9674 8.48034 20.9961 11.9977 20.9961C14.4271 20.9961 16.4639 20.1944 17.9527 18.8202L15.0324 16.5543C14.2308 17.0942 13.2083 17.4214 11.9977 17.4214C9.65824 17.4214 7.67056 15.8427 6.95885 13.7159L6.95517 13.7107Z"
                fill="#34A853"
              />
              <path
                d="M3.96517 7.96533C3.3517 9.17592 3 10.542 3 11.998C3 13.454 3.3517 14.8201 3.96517 16.0307C3.96517 16.0388 6.9591 13.7076 6.9591 13.7076C6.77914 13.1677 6.67277 12.5951 6.67277 11.9979C6.67277 11.4007 6.77914 10.8281 6.9591 10.2883L3.96517 7.96533Z"
                fill="#FBBC05"
              />
              <path
                d="M11.9979 6.58283C13.3231 6.58283 14.501 7.0409 15.4417 7.92435L18.0183 5.34769C16.4559 3.89167 14.4274 3 11.9979 3C8.48052 3 5.44578 5.02045 3.96521 7.96526L6.95905 10.2884C7.67066 8.16156 9.65842 6.58283 11.9979 6.58283Z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-gray-800 font-noto text-base md:text-lg font-bold">
              구글로 로그인
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
