import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "@/lib/auth";
import { SignUpRequest } from "@shared/api";
import { Eye, EyeOff } from "lucide-react";
import { logger } from "@/lib/logger";

interface SignUpPageProps {
  onBack: () => void;
}

export default function SignUpPage({ onBack }: SignUpPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [realName, setRealName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  // 비밀번호 유효성 검사 상태
  const [passwordValidation, setPasswordValidation] = useState({
    hasMinLength: false,
    hasMaxLength: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // 이메일 유효성 검사
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 비밀번호 유효성 검사 (8-20자, 영문/숫자/특수문자 포함)
  const validatePassword = (password: string): boolean => {
    if (password.length < 8 || password.length > 20) {
      return false;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    // 특수문자: 영문/숫자가 아닌 모든 문자
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    return hasLetter && hasNumber && hasSpecialChar;
  };

  // 비밀번호 유효성 검사 상태 업데이트
  const checkPasswordValidation = (pwd: string) => {
    setPasswordValidation({
      hasMinLength: pwd.length >= 8,
      hasMaxLength: pwd.length <= 20,
      hasLetter: /[a-zA-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecialChar: /[^a-zA-Z0-9]/.test(pwd),
    });
  };

  // 전체 폼 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "이메일을 입력해주세요.";
    } else if (!validateEmail(email)) {
      newErrors.email = "올바른 이메일 형식을 입력해주세요.";
    }

    if (!password) {
      newErrors.password = "비밀번호를 입력해주세요.";
    } else if (!validatePassword(password)) {
      newErrors.password =
        "비밀번호는 8-20자이며, 영문/숫자/특수문자를 포함해야 합니다.";
    }

    if (!realName.trim()) {
      newErrors.realName = "사용자 이름을 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setGeneralError("");

    try {
      const signUpData: SignUpRequest = {
        email: email.trim(),
        password,
        real_name: realName.trim(),
      };

      // auth.ts의 signup 함수 사용
      await signup(signUpData);

      // 회원가입 성공 - 프로필 설정 페이지로 이동 (소셜 로그인과 동일)
      navigate("/profile-setup", { replace: true });
    } catch (error) {
      logger.error("회원가입 오류:", error);
      // 에러 메시지를 화면에 표시
      const errorMessage =
        error instanceof Error
          ? error.message
          : "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
      setGeneralError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col safe-area-page font-noto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-gray-800 font-crimson text-lg font-bold">
          회원가입
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-5 overflow-y-auto">
        {/* Description */}
        <div className="mb-8">
          <h2 className="text-black font-crimson text-2xl font-bold leading-8">
            서비스 이용을 위해
            <br />
            가입이 필요해요
          </h2>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              이메일
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors({ ...errors, email: "" });
                  }
                }}
                placeholder="이메일을 입력해주세요"
                className={`w-full h-14 px-4 border rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.email ? "border-red-500" : "border-gray-200"
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const newPassword = e.target.value;
                  setPassword(newPassword);
                  checkPasswordValidation(newPassword);
                  if (errors.password) {
                    setErrors({ ...errors, password: "" });
                  }
                }}
                onBlur={() => {
                  if (password && !validatePassword(password)) {
                    setErrors({
                      ...errors,
                      password:
                        "비밀번호는 8-20자이며, 영문/숫자/특수문자를 포함해야 합니다.",
                    });
                  }
                }}
                placeholder="비밀번호를 입력해주세요 "
                className={`w-full h-14 px-4 pr-12 border rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.password ? "border-red-500" : "border-gray-200"
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.password}
              </p>
            )}
            {/* 비밀번호 규칙 체크리스트 */}
            {password && (
              <div className="space-y-1 mt-2">
                <div
                  className={`flex items-center gap-2 text-sm font-pretendard ${
                    passwordValidation.hasMinLength
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <span>{passwordValidation.hasMinLength ? "✓" : "○"}</span>
                  <span>8자 이상</span>
                </div>
                <div
                  className={`flex items-center gap-2 text-sm font-pretendard ${
                    passwordValidation.hasMaxLength
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <span>{passwordValidation.hasMaxLength ? "✓" : "○"}</span>
                  <span>20자 이하</span>
                </div>
                <div
                  className={`flex items-center gap-2 text-sm font-pretendard ${
                    passwordValidation.hasLetter
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <span>{passwordValidation.hasLetter ? "✓" : "○"}</span>
                  <span>영문 포함</span>
                </div>
                <div
                  className={`flex items-center gap-2 text-sm font-pretendard ${
                    passwordValidation.hasNumber
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <span>{passwordValidation.hasNumber ? "✓" : "○"}</span>
                  <span>숫자 포함</span>
                </div>
                <div
                  className={`flex items-center gap-2 text-sm font-pretendard ${
                    passwordValidation.hasSpecialChar
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <span>{passwordValidation.hasSpecialChar ? "✓" : "○"}</span>
                  <span>특수문자 포함</span>
                </div>
              </div>
            )}
            {!password && (
              <p className="text-gray-500 text-sm font-pretendard">
                8-20자, 영문/숫자/특수문자 포함
              </p>
            )}
          </div>

          {/* Real Name Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              사용자 이름
            </label>
            <div className="relative">
              <input
                type="text"
                value={realName}
                onChange={(e) => {
                  setRealName(e.target.value);
                  if (errors.realName) {
                    setErrors({ ...errors, realName: "" });
                  }
                }}
                placeholder="사용자 이름을 입력해주세요"
                className={`w-full h-14 px-4 border rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.realName ? "border-red-500" : "border-gray-200"
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.realName && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.realName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 일반 에러 메시지 - 가입하기 버튼 바로 위 */}
      {generalError && (
        <div className="px-5 pb-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm font-pretendard">
              {generalError}
            </p>
          </div>
        </div>
      )}

      {/* Sign Up Button */}
      <div className="px-5 pb-8">
        <button
          onClick={handleSignUp}
          disabled={isLoading}
          className={`w-full h-14 bg-orange-500 text-white font-crimson text-xl font-bold rounded-lg transition-colors ${
            isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-600"
          }`}
        >
          {isLoading ? "가입 중..." : "가입하기"}
        </button>
      </div>
    </div>
  );
}
