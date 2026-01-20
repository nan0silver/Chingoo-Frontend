import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getStoredUserInfo,
  getUserProfile,
  updateUserProfile,
} from "@/lib/auth";
import { UserInfo, UserProfile } from "@shared/api";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";
import { Checkbox } from "@/components/ui/checkbox";

// 전화번호 포맷팅 함수 (숫자만 받아서 하이픈 추가)
const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/\D/g, "");

  // 길이에 따라 포맷팅
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else if (numbers.length <= 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  } else {
    // 11자리 초과는 11자리까지만
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }
};

// 전화번호에서 숫자만 추출하는 함수
const extractPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, "");
};

// 전화번호 유효성 검사 함수
const validatePhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) {
    return ""; // 전화번호는 선택사항이므로 빈 값은 에러 없음
  }

  const numbersOnly = extractPhoneNumber(phoneNumber);

  // 10자리 또는 11자리만 유효
  if (numbersOnly.length < 10) {
    return "전화번호는 최소 10자리 이상 입력해주세요.";
  }

  if (numbersOnly.length > 11) {
    return "전화번호는 최대 11자리까지 입력 가능합니다.";
  }

  // 010으로 시작하는지 확인 (일반적인 휴대폰 번호)
  if (numbersOnly.length === 11 && !numbersOnly.startsWith("010")) {
    return "올바른 전화번호 형식이 아닙니다.";
  }

  return ""; // 유효한 경우 에러 없음
};

export default function ProfileSetupPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); // 숫자만 저장 (API 요청용)
  const [phoneNumberError, setPhoneNumberError] = useState(""); // 전화번호 에러 메시지
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [allConsent, setAllConsent] = useState(false);
  const [requiredConsent, setRequiredConsent] = useState(false);
  const [optionalConsent, setOptionalConsent] = useState(false);
  const [showRequiredDetail, setShowRequiredDetail] = useState(false);
  const [showOptionalDetail, setShowOptionalDetail] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 공통 성공 처리 함수
  const scheduleSuccessNavigate = () => {
    setShowSuccessMessage(true);
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 2000);
  };

  // 공통 사용자 정보 업데이트 함수
  const updateUserInfo = () => {
    if (!userProfile) return;

    const updatedUserInfo: UserInfo = {
      id: userProfile.id,
      is_profile_complete: true,
      is_new_user: false,
    };
    localStorage.setItem("user_info", JSON.stringify(updatedUserInfo));
  };

  const handleBottomNavClick = (item: BottomNavItem) => {
    switch (item) {
      case "home":
        navigate("/");
        break;
      case "friends":
        navigate("/friends");
        break;
      case "settings":
        navigate("/settings");
        break;
    }
  };

  // 현재 경로에 따라 activeItem 결정
  const getActiveItem = (): BottomNavItem => {
    // ProfileSetupPage는 설정 페이지에서 접근하므로 항상 "settings" 활성화
    return "settings";
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // LocalStorage의 user_info 확인
        const storedUserInfo = getStoredUserInfo();

        // API에서 최신 사용자 정보 가져오기
        const profileResponse = await getUserProfile();
        const latestUserProfile = profileResponse.data;

        setUserProfile(latestUserProfile);
        setNickname(latestUserProfile.nickname || "");

        // is_new_user가 undefined인 경우 localStorage의 값 사용
        const isNewUser =
          latestUserProfile.is_new_user ?? storedUserInfo?.is_new_user ?? false;

        // 기존 유저인 경우에만 성별, 생년월일, 전화번호 정보 설정
        if (!isNewUser) {
          // 기존 성별 정보가 있으면 설정
          if (latestUserProfile.gender) {
            setGender(latestUserProfile.gender);
          }

          // 기존 생년월일 정보가 있으면 설정
          if (latestUserProfile.birth) {
            const [year, month, day] = latestUserProfile.birth.split("-");
            setBirthYear(year);
            setBirthMonth(month);
            setBirthDay(day);
          }

          // 기존 전화번호 정보가 있으면 설정 (숫자만 추출하여 저장)
          if (latestUserProfile.phone_number) {
            setPhoneNumber(extractPhoneNumber(latestUserProfile.phone_number));
          }
        }

        // 신규 유저인 경우 개인정보 수집 동의 모달 표시
        if (isNewUser) {
          // 모달 열 때 상태 초기화
          setAllConsent(false);
          setRequiredConsent(false);
          setOptionalConsent(false);
          setShowRequiredDetail(false);
          setShowOptionalDetail(false);
          setShowConsentModal(true);
        }
      } catch (error) {
        console.error("사용자 프로필 가져오기 실패:", error);

        // 인증 만료 오류인 경우 로그인 페이지로 이동
        if (
          error instanceof Error &&
          error.message.includes("인증이 만료되었습니다")
        ) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          navigate("/login");
          return;
        }

        // API 실패 시 로컬 저장된 최소 정보로 기본값 설정
        const storedUserInfo = getStoredUserInfo();
        if (!storedUserInfo) {
          navigate("/login");
          return;
        }

        // 최소한의 정보로 기본 프로필 생성
        const fallbackProfile: UserProfile = {
          id: storedUserInfo.id,
          email: "", // API에서만 조회
          nickname: "", // API에서만 조회
          is_new_user: storedUserInfo.is_new_user,
          is_profile_complete: storedUserInfo.is_profile_complete,
        };
        setUserProfile(fallbackProfile);
        setNickname("");

        // 신규 유저인 경우 개인정보 수집 동의 모달 표시
        if (fallbackProfile.is_new_user) {
          // 모달 열 때 상태 초기화
          setAllConsent(false);
          setRequiredConsent(false);
          setOptionalConsent(false);
          setShowRequiredDetail(false);
          setShowOptionalDetail(false);
          setShowConsentModal(true);
        }
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // 전체 동의 핸들러
  const handleAllConsent = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setAllConsent(isChecked);
    setRequiredConsent(isChecked);
    setOptionalConsent(isChecked);
  };

  // 필수 항목 동의 핸들러
  const handleRequiredConsent = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setRequiredConsent(isChecked);
    // 필수와 선택이 모두 체크되어 있으면 전체 동의도 체크
    setAllConsent(isChecked && optionalConsent);
  };

  // 선택 항목 동의 핸들러
  const handleOptionalConsent = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setOptionalConsent(isChecked);
    // 필수와 선택이 모두 체크되어 있으면 전체 동의도 체크
    setAllConsent(requiredConsent && isChecked);
  };

  const handleConsent = () => {
    // 필수 항목은 반드시 동의해야 함
    if (!requiredConsent) {
      alert("필수 항목에 동의해주세요.");
      return;
    }
    setHasConsented(true);
    setShowConsentModal(false);
    // 모달 닫을 때 상태 초기화
    setAllConsent(false);
    setRequiredConsent(false);
    setOptionalConsent(false);
    setShowRequiredDetail(false);
    setShowOptionalDetail(false);
  };

  const handleSaveProfile = async () => {
    // 필수 입력 검증
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!gender) {
      alert("성별을 선택해주세요.");
      return;
    }

    if (!birthYear || !birthMonth || !birthDay) {
      alert("생년월일을 모두 입력해주세요.");
      return;
    }

    // 생년월일 유효성 검증
    const year = parseInt(birthYear);
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) {
      alert("올바른 연도를 입력해주세요.");
      return;
    }

    if (month < 1 || month > 12) {
      alert("올바른 월을 입력해주세요.");
      return;
    }

    if (day < 1 || day > 31) {
      alert("올바른 일을 입력해주세요.");
      return;
    }

    // YYYY-MM-DD 형식으로 변환
    const birth = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;

    // 전화번호 유효성 검증
    const phoneError = validatePhoneNumber(phoneNumber);
    if (phoneError) {
      setPhoneNumberError(phoneError);
      return;
    }
    setPhoneNumberError(""); // 유효한 경우 에러 메시지 제거

    // 변경 사항 확인
    const hasNicknameChanged = userProfile && nickname !== userProfile.nickname;
    const hasGenderChanged = userProfile && gender !== userProfile.gender;
    const hasBirthChanged = userProfile && birth !== userProfile.birth;
    // 전화번호 비교 시 숫자만 추출하여 비교 (하이픈 제거)
    const hasPhoneNumberChanged =
      userProfile &&
      phoneNumber !== extractPhoneNumber(userProfile.phone_number || "");

    // 변경된 필드만 포함하는 요청 바디 구성
    const requestBody: {
      nickname?: string;
      gender?: string;
      birth?: string;
      phone_number?: string;
    } = {};

    if (hasNicknameChanged) {
      requestBody.nickname = nickname;
    }

    if (hasGenderChanged) {
      requestBody.gender = gender;
    }

    if (hasBirthChanged) {
      requestBody.birth = birth;
    }

    if (hasPhoneNumberChanged) {
      requestBody.phone_number = phoneNumber;
    }

    // 변경 사항이 없는 경우
    if (Object.keys(requestBody).length === 0) {
      updateUserInfo();
      scheduleSuccessNavigate();
      return;
    }

    setIsLoading(true);

    try {
      // 실제 API 호출
      await updateUserProfile(requestBody);

      updateUserInfo();
      scheduleSuccessNavigate();
    } catch (error) {
      console.error("프로필 저장 실패:", error);

      // 인증 만료 오류인 경우 로그인 페이지로 이동
      if (
        error instanceof Error &&
        error.message.includes("인증이 만료되었습니다")
      ) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login");
        return;
      }

      alert("프로필 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center safe-area-page">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-login-button"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center relative safe-area-page font-noto pb-20 overflow-y-auto"
      aria-busy={showSuccessMessage}
    >
      {/* Privacy Consent Modal */}
      {showConsentModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
        >
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2
              id="consent-title"
              className="text-xl md:text-2xl font-crimson font-bold text-gray-900 mb-6"
            >
              개인정보 수집 및 이용 동의
            </h2>

            <div className="space-y-4 mb-6">
              {/* 약관 전체동의 */}
              <div className="pb-4 border-b border-gray-200">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    checked={allConsent}
                    onCheckedChange={handleAllConsent}
                    className="h-5 w-5"
                  />
                  <span className="text-lg font-semibold text-gray-900">
                    약관 전체동의
                  </span>
                </label>
              </div>

              {/* 필수 항목 */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  필수 항목
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        checked={requiredConsent}
                        onCheckedChange={handleRequiredConsent}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-900">
                        (필수) 개인정보 수집·이용 동의
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowRequiredDetail(!showRequiredDetail);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          showRequiredDetail ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </label>

                  {/* 필수 항목 상세보기 */}
                  {showRequiredDetail && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 text-gray-700">
                      {/* 1. 수집하는 개인정보 항목 */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                          1. 수집하는 개인정보 항목
                        </h3>
                        <p className="text-xs mb-2">
                          본 서비스는 서비스 제공을 위해 다음과 같은 개인정보를
                          수집합니다.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="font-medium text-gray-900 mb-1">
                              필수 항목
                            </p>
                            <p className="text-gray-700">
                              이메일, 닉네임, 성별, 생년월일
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 mb-1">
                              서비스 이용 과정에서 자동 수집되는 정보
                            </p>
                            <p className="text-gray-700">
                              서비스 이용 기록, 접속 로그, 통화 일시 및 이용 이력
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 mb-1">
                              서비스 제공을 위해 생성·수집되는 정보
                            </p>
                            <p className="text-gray-700">
                              음성 통화 데이터(통화 내용)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 2. 개인정보의 수집 및 이용 목적 */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                          2. 개인정보의 수집 및 이용 목적
                        </h3>
                        <p className="text-xs mb-2">
                          수집된 개인정보는 다음의 목적을 위해 이용됩니다.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>회원 가입 및 본인 확인, 회원 관리</li>
                          <li>음성 기반 통화 매칭 서비스 제공</li>
                          <li>서비스 이용 통계 분석 및 품질 개선</li>
                          <li>고객 문의 및 민원 대응</li>
                          <li>
                            음성 데이터 분석을 통한 서비스 기능 개선 및 내부 연구
                            목적의 AI 모델 성능 향상
                          </li>
                        </ul>
                        <p className="text-xs mt-2 text-gray-600 italic">
                          ※ 음성 데이터는 서비스 제공 및 분석 목적에 한하여
                          이용되며, 개인을 식별할 수 없도록 처리된 후 내부 연구
                          및 기술 고도화 목적으로만 활용됩니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 선택 항목 */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  선택 항목
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        checked={optionalConsent}
                        onCheckedChange={handleOptionalConsent}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-900">
                        (선택) 서비스 개선 및 연구를 위한 데이터 활용 동의
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowOptionalDetail(!showOptionalDetail);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          showOptionalDetail ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </label>

                  {/* 선택 항목 상세보기 */}
                  {showOptionalDetail && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 text-gray-700">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                          3. [선택] 비식별화된 분석 데이터 및 연구 결과 활용 동의
                        </h3>
                        <p className="text-xs">
                          본 서비스는 서비스 개선, 연구 및 산업 발전을 목적으로
                          이용자의 서비스 이용 과정에서 생성된 정보를 개인을
                          식별할 수 없도록 완전히 비식별화한 후, 분석 결과물 또는
                          통계적 지표의 형태로 내부 활용하거나 제3자에게 제공할
                          수 있습니다.
                        </p>

                        {/* 3-1. 활용되는 데이터의 범위 */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-xs">
                            3-1. 활용되는 데이터의 범위
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>
                              음성 통화 데이터로부터 추출된 음성 특징값 및 패턴
                              지표
                            </li>
                            <li>
                              통화 빈도, 지속 시간, 반응 양상 등 개인 식별이
                              불가능한 통계 정보
                            </li>
                            <li>
                              감정 상태, 대화 특성 등에 대한 분석 결과 지표
                            </li>
                          </ul>
                          <p className="text-xs mt-2 text-gray-600 italic">
                            ※ 음성 원본, 이메일, 닉네임 등 개인을 직접 식별할 수
                            있는 정보는 어떠한 경우에도 외부에 제공되지 않습니다.
                          </p>
                        </div>

                        {/* 3-2. 활용 목적 */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-xs">
                            3-2. 활용 목적
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>음성 및 대화 분석 기술 연구</li>
                            <li>AI 모델의 성능 향상, 검증 및 고도화</li>
                            <li>
                              고령자 커뮤니케이션 및 정서 분석 관련 연구
                            </li>
                            <li>
                              관련 산업 분야의 기술 개발 및 서비스 고도화
                            </li>
                          </ul>
                        </div>

                        {/* 3-3. 제공 방식 및 대상 */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-xs">
                            3-3. 제공 방식 및 대상
                          </h4>
                          <p className="text-xs mb-2">
                            비식별화된 분석 결과물 또는 통계 자료의 형태로 제공
                          </p>
                          <p className="font-medium text-gray-900 mb-1 text-xs">
                            제공 대상:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>AI, 헬스케어, 고령자 복지 관련 기업</li>
                            <li>연구기관, 학술기관, 공공기관 등</li>
                          </ul>
                        </div>

                        {/* 3-4. 보유 및 이용 기간 */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-xs">
                            3-4. 보유 및 이용 기간
                          </h4>
                          <p className="text-xs">
                            비식별화된 분석 데이터는 활용 목적 달성 시까지
                            보관·이용됩니다.
                          </p>
                        </div>

                        {/* 3-5. 동의 거부 및 철회 권리 */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-xs">
                            3-5. 동의 거부 및 철회 권리
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>
                              본 동의는 선택 사항이며, 동의하지 않아도 서비스
                              이용에 제한이 없습니다.
                            </li>
                            <li>
                              이용자는 언제든지 동의를 철회할 수 있으며, 철회
                              이후 생성되는 데이터는 본 목적에 활용되지 않습니다.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConsent}
                disabled={!requiredConsent}
                className="w-full h-14 bg-login-button text-white font-crimson text-lg font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                동의합니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Overlay */}
      {showSuccessMessage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-save-title"
          aria-describedby="profile-save-desc"
        >
          <div className="bg-white rounded-lg p-6 mx-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3
              id="profile-save-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              프로필이 저장되었습니다!
            </h3>
            <p id="profile-save-desc" className="text-gray-600">
              잠시 후 메인 페이지로 이동합니다...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-sm md:max-w-md px-5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              // 신규 유저는 홈으로, 기존 유저는 설정 페이지로
              if (userProfile.is_new_user) {
                navigate("/");
              } else {
                navigate("/settings");
              }
            }}
            className="p-2 -ml-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-lg font-crimson font-bold text-gray-900">
            프로필 설정
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-sm md:max-w-md px-5 space-y-6">
        {/* Welcome Message */}
        <div className="text-center py-4">
          <h2 className="text-xl font-crimson text-gray-900 mb-2">
            {userProfile.is_new_user ? "환영합니다!" : "프로필을 완성해주세요"}
          </h2>
          <p className="text-gray-600">
            {userProfile.is_new_user
              ? "서비스를 이용하기 위해 프로필을 설정해주세요."
              : "추가 정보를 입력해주세요."}
          </p>
        </div>

        {/* Email Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <p className="text-gray-900">{userProfile.email}</p>
        </div>

        {/* Nickname Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            닉네임 *
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력해주세요"
            disabled={userProfile?.is_new_user && !hasConsented}
            className="w-full h-12 md:h-14 px-4 border border-border-gray rounded-lg font-crimson text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Gender Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            성별 *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender("MALE")}
              disabled={userProfile?.is_new_user && !hasConsented}
              className={`h-12 md:h-14 px-4 border rounded-lg font-crimson text-lg md:text-xl transition-all ${
                gender === "MALE"
                  ? "border-login-button bg-login-button/10 text-login-button"
                  : "border-border-gray text-gray-700 hover:border-login-button/50"
              } disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              남성
            </button>
            <button
              type="button"
              onClick={() => setGender("FEMALE")}
              disabled={userProfile?.is_new_user && !hasConsented}
              className={`h-12 md:h-14 px-4 border rounded-lg font-crimson text-lg md:text-xl transition-all ${
                gender === "FEMALE"
                  ? "border-login-button bg-login-button/10 text-login-button"
                  : "border-border-gray text-gray-700 hover:border-login-button/50"
              } disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              여성
            </button>
          </div>
        </div>

        {/* Birth Date Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            생년월일 *
          </label>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="년(4자)"
              min="1900"
              max={new Date().getFullYear()}
              disabled={userProfile?.is_new_user && !hasConsented}
              className="h-12 md:h-14 px-4 border border-border-gray rounded-lg font-crimson text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <input
              type="number"
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              placeholder="월"
              min="1"
              max="12"
              disabled={userProfile?.is_new_user && !hasConsented}
              className="h-12 md:h-14 px-4 border border-border-gray rounded-lg font-crimson text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <input
              type="number"
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              placeholder="일"
              min="1"
              max="31"
              disabled={userProfile?.is_new_user && !hasConsented}
              className="h-12 md:h-14 px-4 border border-border-gray rounded-lg font-crimson text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Phone Number Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            전화번호
          </label>
          <input
            type="tel"
            value={formatPhoneNumber(phoneNumber)}
            onChange={(e) => {
              // 입력값에서 숫자만 추출하여 저장 (API 요청용)
              const numbersOnly = extractPhoneNumber(e.target.value);
              // 최대 11자리까지만 허용
              if (numbersOnly.length <= 11) {
                setPhoneNumber(numbersOnly);
                // 입력 중에는 에러 메시지 초기화 (저장 시에만 검증)
                if (phoneNumberError) {
                  setPhoneNumberError("");
                }
              }
            }}
            placeholder="010-1234-5678"
            disabled={userProfile?.is_new_user && !hasConsented}
            className={`w-full h-12 md:h-14 px-4 border rounded-lg font-crimson text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              phoneNumberError
                ? "border-red-500 focus:ring-red-500"
                : "border-border-gray"
            }`}
          />
          {phoneNumberError && (
            <p className="mt-2 text-sm text-red-500">{phoneNumberError}</p>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-4 pb-20">
          <button
            onClick={handleSaveProfile}
            disabled={
              isLoading ||
              !nickname.trim() ||
              !gender ||
              !birthYear ||
              !birthMonth ||
              !birthDay ||
              showSuccessMessage
            }
            className="w-full h-14 md:h-16 bg-gradient-to-r from-yellow-300 to-red-gradient text-white font-crimson text-xl md:text-2xl font-bold rounded-lg hover:opacity-90 transition-opacity disabled:bg-gray-300 disabled:bg-none disabled:cursor-not-allowed"
          >
            {isLoading ? "저장 중..." : "프로필 저장"}
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeItem={getActiveItem()}
        onItemClick={handleBottomNavClick}
      />
    </div>
  );
}
