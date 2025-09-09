import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStoredUserInfo,
  getUserProfile,
  updateUserProfile,
} from "@/lib/auth";
import { UserInfo } from "@shared/api";

export default function ProfileSetupPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // API에서 최신 사용자 정보 가져오기
        const profileResponse = await getUserProfile();
        const latestUserInfo = profileResponse.data;

        setUserInfo(latestUserInfo);
        setNickname(latestUserInfo.nickname || "");
      } catch (error) {
        console.error("사용자 프로필 가져오기 실패:", error);

        // API 실패 시 로컬 저장된 정보 사용
        const storedUserInfo = getStoredUserInfo();
        if (!storedUserInfo) {
          navigate("/login");
          return;
        }

        setUserInfo(storedUserInfo);
        setNickname(storedUserInfo.nickname || "");
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    // 기존 닉네임과 동일한지 확인
    if (userInfo && nickname === userInfo.nickname) {
      alert("기존 닉네임과 동일합니다. 변경사항이 없습니다.");
      return;
    }

    setIsLoading(true);

    try {
      // 실제 API 호출
      await updateUserProfile(nickname);

      // 사용자 정보 업데이트
      const updatedUserInfo = {
        ...userInfo,
        nickname: nickname,
        is_profile_complete: true,
        is_new_user: false,
      };
      localStorage.setItem("user_info", JSON.stringify(updatedUserInfo));

      alert("프로필이 저장되었습니다!");
      navigate("/"); // 메인 페이지로 이동
    } catch (error) {
      console.error("프로필 저장 실패:", error);
      alert("프로필 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-login-button"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* Status Bar - only show on mobile */}
      <div className="w-full max-w-sm relative md:hidden">
        <div className="flex justify-between items-center px-6 py-3 h-11">
          <span className="text-black text-lg font-medium">9:41</span>
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-black rounded-sm"></div>
              <div className="w-1 h-3 bg-black rounded-sm"></div>
              <div className="w-1 h-5 bg-black rounded-sm"></div>
              <div className="w-1 h-2 bg-black rounded-sm"></div>
            </div>
            {/* WiFi icon */}
            <svg
              width="15"
              height="11"
              viewBox="0 0 15 11"
              fill="none"
              className="ml-2"
            >
              <path
                d="M7.5 3.5C10.5 3.5 13 5.5 13 8H12C12 6.5 9.5 5 7.5 5S3 6.5 3 8H2C2 5.5 4.5 3.5 7.5 3.5Z"
                fill="black"
              />
            </svg>
            {/* Battery */}
            <div className="ml-2 w-6 h-3 border border-black rounded-sm relative">
              <div className="absolute inset-0.5 bg-black rounded-sm"></div>
              <div className="absolute -right-1 top-1 w-0.5 h-1 bg-black rounded-r"></div>
            </div>
          </div>
        </div>
      </div>

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
            {userInfo.is_new_user ? "환영합니다!" : "프로필을 완성해주세요"}
          </h2>
          <p className="text-gray-600">
            {userInfo.is_new_user
              ? "서비스를 이용하기 위해 프로필을 설정해주세요."
              : "추가 정보를 입력해주세요."}
          </p>
        </div>

        {/* Email Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일
          </label>
          <p className="text-gray-900">{userInfo.email}</p>
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
            disabled={isLoading || !nickname.trim()}
            className="w-full h-14 md:h-16 bg-login-button text-white font-crimson text-xl md:text-2xl font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "저장 중..." : "프로필 저장"}
          </button>
        </div>

        {/* Skip Button for existing users */}
        {!userInfo.is_new_user && (
          <div className="text-center">
            <button
              onClick={() => navigate("/")}
              className="text-gray-600 underline hover:text-gray-800"
            >
              나중에 설정하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
