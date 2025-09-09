import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUserInfo, logout, isAuthenticated } from "@/lib/auth";
import { UserInfo } from "@shared/api";

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const storedUserInfo = getStoredUserInfo();
    if (!storedUserInfo) {
      navigate("/login");
      return;
    }

    setUserInfo(storedUserInfo);
  }, [navigate]);

  const handleLogout = () => {
    if (confirm("로그아웃하시겠습니까?")) {
      logout();
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
          <h1 className="text-lg font-crimson font-bold text-gray-900">
            대시보드
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 underline"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-sm md:max-w-md px-5 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-login-button to-blue-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-crimson font-bold mb-2">
            안녕하세요, {userInfo.nickname}님!
          </h2>
          <p className="text-blue-100">
            {userInfo.is_new_user
              ? "신규 가입을 환영합니다!"
              : "다시 오신 것을 환영합니다!"}
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-crimson font-bold text-gray-900 mb-4">
            사용자 정보
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <p className="text-gray-900">{userInfo.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                닉네임
              </label>
              <p className="text-gray-900">{userInfo.nickname}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                가입 상태
              </label>
              <p className="text-gray-900">
                {userInfo.is_new_user ? "신규 사용자" : "기존 사용자"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                프로필 완성도
              </label>
              <p className="text-gray-900">
                {userInfo.is_profile_complete ? "완성" : "미완성"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!userInfo.is_profile_complete && (
            <button
              onClick={() => navigate("/profile-setup")}
              className="w-full h-12 bg-white border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-gray-800 font-crimson text-base font-bold">
                프로필 완성하기
              </span>
            </button>
          )}

          <button
            onClick={() => navigate("/settings")}
            className="w-full h-12 bg-white border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="text-gray-800 font-crimson text-base font-bold">
              설정
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

