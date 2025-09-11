import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStoredUserInfo,
  getUserProfile,
  updateUserProfile,
} from "@/lib/auth";
import { UserInfo, UserProfile } from "@shared/api";

export default function ProfileSetupPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // API에서 최신 사용자 정보 가져오기
        const profileResponse = await getUserProfile();
        const latestUserProfile = profileResponse.data;

        setUserProfile(latestUserProfile);
        setNickname(latestUserProfile.nickname || "");
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
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    // 기존 닉네임과 동일한 경우 API 요청 없이 바로 메인 페이지로 이동
    if (userProfile && nickname === userProfile.nickname) {
      updateUserInfo();
      scheduleSuccessNavigate();
      return;
    }

    setIsLoading(true);

    try {
      // 실제 API 호출
      await updateUserProfile(nickname);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-login-button"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center relative">
      {/* Success Message Overlay */}
      {showSuccessMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              프로필이 저장되었습니다!
            </h3>
            <p className="text-gray-600">잠시 후 메인 페이지로 이동합니다...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-sm md:max-w-md px-5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
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
            className="w-full h-12 md:h-14 px-4 border border-border-gray rounded-lg font-crimson text-lg md:text-xl placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent"
          />
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={isLoading || !nickname.trim() || showSuccessMessage}
            className="w-full h-14 md:h-16 bg-login-button text-white font-crimson text-xl md:text-2xl font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "저장 중..." : "프로필 저장"}
          </button>
        </div>

        {/* Skip Button for existing users */}
        {!userProfile.is_new_user && (
          <div className="text-center">
            <button
              onClick={() => {
                updateUserInfo();
                navigate("/", { replace: true });
              }}
              disabled={showSuccessMessage}
              className="text-gray-600 underline hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              나중에 설정하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
