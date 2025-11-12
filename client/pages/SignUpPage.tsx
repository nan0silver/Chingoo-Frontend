import { useState } from "react";
import { SignUpRequest, SignUpResponse, ApiErrorResponse } from "@shared/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SignUpPageProps {
  onBack: () => void;
  onSignUp: () => void;
}

export default function SignUpPage({ onBack, onSignUp }: SignUpPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [birth, setBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    if (!nickname.trim()) {
      newErrors.nickname = "닉네임을 입력해주세요.";
    }

    if (!realName.trim()) {
      newErrors.realName = "사용자 이름을 입력해주세요.";
    }

    if (!birth) {
      newErrors.birth = "생년월일을 선택해주세요.";
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
        nickname: nickname.trim(),
        real_name: realName.trim(),
        gender,
        birth,
      };

      // API 기본 URL 설정 (환경변수 사용)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
        : "/api";

      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(signUpData),
      });

      // 응답 본문을 텍스트로 먼저 읽기
      const responseText = await response.text();

      if (!response.ok) {
        let errorData: ApiErrorResponse;
        let errorMessage = "";

        try {
          // JSON 파싱 시도
          errorData = JSON.parse(responseText);

          // 필드별 에러 처리
          if (errorData.errors && errorData.errors.length > 0) {
            const fieldErrors: Record<string, string> = {};
            errorData.errors.forEach((error) => {
              if (error.field) {
                // 필드명 매핑 (백엔드 필드명 -> 프론트엔드 필드명)
                const fieldMap: Record<string, string> = {
                  email: "email",
                  password: "password",
                  nickname: "nickname",
                  real_name: "realName",
                  gender: "gender",
                  birth: "birth",
                };
                const frontendField = fieldMap[error.field] || error.field;
                fieldErrors[frontendField] = error.message;
              } else {
                // 필드가 없는 일반 에러 메시지
                errorMessage += error.message + " ";
              }
            });

            if (Object.keys(fieldErrors).length > 0) {
              setErrors(fieldErrors);
            }

            // 일반 에러 메시지 설정
            if (errorData.message) {
              setGeneralError(errorData.message);
            } else if (errorMessage.trim()) {
              setGeneralError(errorMessage.trim());
            } else {
              setGeneralError(
                "회원가입에 실패했습니다. 입력 정보를 확인해주세요.",
              );
            }
          } else if (errorData.message) {
            setGeneralError(errorData.message);
          } else {
            setGeneralError(
              `회원가입에 실패했습니다. (상태 코드: ${response.status})`,
            );
          }
        } catch (parseError) {
          // JSON 파싱 실패 시 원본 텍스트 표시
          console.error("에러 응답 파싱 실패:", parseError);
          console.error("원본 응답:", responseText);
          setGeneralError(
            responseText ||
              `회원가입에 실패했습니다. (상태 코드: ${response.status})`,
          );
        }
        return;
      }

      // 성공 시 응답 처리
      try {
        const data: SignUpResponse = JSON.parse(responseText);
        setShowSuccessModal(true);
      } catch (parseError) {
        console.error("응답 파싱 실패:", parseError);
        // 파싱 실패해도 성공 상태 코드면 성공으로 처리
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("회원가입 오류:", error);
      setGeneralError(
        error instanceof Error
          ? error.message
          : "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col safe-area-page">
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
                type="password"
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
                className={`w-full h-14 px-4 border rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.password ? "border-red-500" : "border-gray-200"
                }`}
              />
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

          {/* Nickname Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              닉네임
            </label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (errors.nickname) {
                    setErrors({ ...errors, nickname: "" });
                  }
                }}
                placeholder="닉네임을 입력해주세요"
                className={`w-full h-14 px-4 border rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.nickname ? "border-red-500" : "border-gray-200"
                }`}
              />
            </div>
            {errors.nickname && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.nickname}
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
              />
            </div>
            {errors.realName && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.realName}
              </p>
            )}
          </div>

          {/* Gender Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              성별
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setGender("MALE");
                  if (errors.gender) {
                    setErrors({ ...errors, gender: "" });
                  }
                }}
                className={`flex-1 h-14 px-4 border rounded-lg font-crimson text-xl transition-colors ${
                  gender === "MALE"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                }`}
              >
                남성
              </button>
              <button
                type="button"
                onClick={() => {
                  setGender("FEMALE");
                  if (errors.gender) {
                    setErrors({ ...errors, gender: "" });
                  }
                }}
                className={`flex-1 h-14 px-4 border rounded-lg font-crimson text-xl transition-colors ${
                  gender === "FEMALE"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                }`}
              >
                여성
              </button>
            </div>
            {errors.gender && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.gender}
              </p>
            )}
          </div>

          {/* Birth Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              생년월일
            </label>
            <div className="relative">
              <input
                type="date"
                value={birth}
                onChange={(e) => {
                  setBirth(e.target.value);
                  if (errors.birth) {
                    setErrors({ ...errors, birth: "" });
                  }
                }}
                max={new Date().toISOString().split("T")[0]}
                className={`w-full h-14 px-4 border rounded-lg font-crimson text-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.birth ? "border-red-500" : "border-gray-200"
                }`}
              />
            </div>
            {errors.birth && (
              <p className="text-red-500 text-sm font-pretendard">
                {errors.birth}
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

      {/* 회원가입 완료 모달 */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="max-w-md mx-4 rounded-2xl p-6 md:p-8">
          <AlertDialogHeader className="text-center sm:text-left">
            <AlertDialogTitle className="text-xl md:text-2xl font-crimson font-bold text-gray-900 mb-3">
              회원가입 완료
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-pretendard text-gray-600">
              회원가입이 완료되었습니다.
              <br />
              로그인 페이지로 이동하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            <AlertDialogAction
              onClick={() => {
                setShowSuccessModal(false);
                onSignUp();
              }}
              className="w-full sm:w-auto bg-orange-500 text-white font-crimson text-lg font-semibold hover:bg-orange-600 rounded-lg py-3 px-6"
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
