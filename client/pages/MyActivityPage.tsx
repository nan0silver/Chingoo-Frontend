import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken } from "@/lib/auth";
import { ActivityStats } from "@shared/api";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";

interface MyActivityPageProps {
  onBack: () => void;
}

export default function MyActivityPage({ onBack }: MyActivityPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 활동 통계 조회
  useEffect(() => {
    const fetchActivityStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const matchingApi = getMatchingApiService();
        const token = getStoredToken();

        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }

        matchingApi.setToken(token);
        const data = await matchingApi.getActivityStats();

        // 디버깅: 받은 데이터 확인
        if (import.meta.env.DEV) {
          console.log("📊 MyActivityPage - 받은 데이터:", data);
          console.log("📊 주간:", data.weeklyStats);
          console.log("📊 분기:", data.quarterlyStats);
        }

        setStats(data);
      } catch (err) {
        console.error("활동 통계 조회 실패:", err);
        setError(
          err instanceof Error
            ? err.message
            : "활동 통계를 불러올 수 없습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityStats();
  }, []);

  // 분 단위를 "X시간 Y분" 형식으로 변환
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return "1분 미만";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  // 등급 계산 (주간 기준)
  const getGrade = (): { level: string; displayName: string } => {
    if (!stats) return { level: "NEW", displayName: "신규회원" };

    const { callCount, totalDurationMinutes } = stats.weeklyStats;

    if (callCount >= 4 || totalDurationMinutes >= 90) {
      return { level: "EXCELLENT", displayName: "우수회원" };
    } else if (callCount >= 1) {
      return { level: "GOOD", displayName: "일반회원" };
    } else {
      return { level: "NEW", displayName: "신규회원" };
    }
  };

  const grade = getGrade();

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
    // MyActivityPage는 설정 페이지에서 접근하므로 항상 "settings" 활성화
    return "settings";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col safe-area-page font-noto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={() => navigate("/settings")} className="p-1">
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
          내 활동 보기
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-5">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
              <p className="text-gray-600 font-pretendard">
                활동 통계를 불러오는 중...
              </p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 font-pretendard mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-pretendard"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 데이터 표시 */}
        {!isLoading && !error && stats && (
          <>
            {/* Grade Question */}
            <div className="text-center mb-8">
              <h2 className="text-gray-800 font-pretendard text-3xl font-medium">
                이번주 등급은?
              </h2>
            </div>

            {/* Grade Badge */}
            <div className="flex justify-center mb-16">
              <div
                className="flex flex-col items-center justify-center gap-1 px-10 py-3 rounded-xl border-2 border-white/50"
                style={{
                  background:
                    grade.level === "EXCELLENT"
                      ? "linear-gradient(93deg, #F4BC41 0.31%, #E26155 100.05%)"
                      : grade.level === "GOOD"
                        ? "linear-gradient(93deg, #4B9FE1 0.31%, #6CC4A1 100.05%)"
                        : "linear-gradient(93deg, #FCD34D 0.31%, #F59E0B 100.05%)",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M9.33333 14.4V9.33333H6.66667V10.6667C6.66667 11.5111 6.91111 12.2722 7.4 12.95C7.88889 13.6278 8.53333 14.1111 9.33333 14.4ZM22.6667 14.4C23.4667 14.1111 24.1111 13.6278 24.6 12.95C25.0889 12.2722 25.3333 11.5111 25.3333 10.6667V9.33333H22.6667V14.4ZM14.6667 25.3333V21.2C13.5778 20.9556 12.6056 20.4944 11.75 19.8167C10.8944 19.1389 10.2667 18.2889 9.86667 17.2667C8.2 17.0667 6.80556 16.3389 5.68333 15.0833C4.56111 13.8278 4 12.3556 4 10.6667V9.33333C4 8.6 4.26111 7.97222 4.78333 7.45C5.30556 6.92778 5.93333 6.66667 6.66667 6.66667H9.33333C9.33333 5.93333 9.59444 5.30556 10.1167 4.78333C10.6389 4.26111 11.2667 4 12 4H20C20.7333 4 21.3611 4.26111 21.8833 4.78333C22.4056 5.30556 22.6667 5.93333 22.6667 6.66667H25.3333C26.0667 6.66667 26.6944 6.92778 27.2167 7.45C27.7389 7.97222 28 8.6 28 9.33333V10.6667C28 12.3556 27.4389 13.8278 26.3167 15.0833C25.1944 16.3389 23.8 17.0667 22.1333 17.2667C21.7333 18.2889 21.1056 19.1389 20.25 19.8167C19.3944 20.4944 18.4222 20.9556 17.3333 21.2V25.3333H21.3333C21.7111 25.3333 22.0278 25.4611 22.2833 25.7167C22.5389 25.9722 22.6667 26.2889 22.6667 26.6667C22.6667 27.0444 22.5389 27.3611 22.2833 27.6167C22.0278 27.8722 21.7111 28 21.3333 28H10.6667C10.2889 28 9.97222 27.8722 9.71667 27.6167C9.46111 27.3611 9.33333 27.0444 9.33333 26.6667C9.33333 26.2889 9.46111 25.9722 9.71667 25.7167C9.97222 25.4611 10.2889 25.3333 10.6667 25.3333H14.6667Z"
                    fill="white"
                  />
                </svg>
                <span className="text-white font-crimson text-xl font-bold">
                  {grade.displayName}
                </span>
              </div>
            </div>

            {/* Weekly Activity Summary */}
            <div className="mb-8">
              <h3 className="text-orange-500 font-crimson text-2xl font-bold mb-4">
                주간 활동 요약
              </h3>

              <div className="space-y-4">
                {/* Call Count */}
                <div className="flex items-center justify-between p-5 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19.95 21C17.8667 21 15.8083 20.5458 13.775 19.6375C11.7417 18.7292 9.89167 17.4417 8.225 15.775C6.55833 14.1083 5.27083 12.2583 4.3625 10.225C3.45417 8.19167 3 6.13333 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07917 8.725 3.2375C8.90833 3.39583 9.01667 3.58333 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.70417 12.1125 8.1625 12.6875C8.62083 13.2625 9.125 13.8167 9.675 14.35C10.1917 14.8667 10.7333 15.3458 11.3 15.7875C11.8667 16.2292 12.4667 16.6333 13.1 17L15.45 14.65C15.6 14.5 15.7958 14.3875 16.0375 14.3125C16.2792 14.2375 16.5167 14.2167 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1375 20.775 15.3125C20.925 15.4875 21 15.6833 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z"
                        fill="#3C3F3D"
                      />
                    </svg>
                    <span className="text-gray-800 font-crimson text-xl font-semibold">
                      통화 횟수
                    </span>
                  </div>
                  <span className="text-gray-800 font-crimson text-xl">
                    {stats.weeklyStats.callCount}회
                  </span>
                </div>

                {/* Call Time */}
                <div className="flex items-center justify-between p-5 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M13 11.6V8C13 7.71667 12.9042 7.47917 12.7125 7.2875C12.5208 7.09583 12.2833 7 12 7C11.7167 7 11.4792 7.09583 11.2875 7.2875C11.0958 7.47917 11 7.71667 11 8V11.975C11 12.1083 11.025 12.2375 11.075 12.3625C11.125 12.4875 11.2 12.6 11.3 12.7L14.6 16C14.7833 16.1833 15.0167 16.275 15.3 16.275C15.5833 16.275 15.8167 16.1833 16 16C16.1833 15.8167 16.275 15.5833 16.275 15.3C16.275 15.0167 16.1833 14.7833 16 14.6L13 11.6ZM12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22Z"
                        fill="#3C3F3D"
                      />
                    </svg>
                    <span className="text-gray-800 font-crimson text-xl font-semibold">
                      통화 시간
                    </span>
                  </div>
                  <span className="text-gray-800 font-crimson text-xl">
                    {formatDuration(stats.weeklyStats.totalDurationMinutes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quarterly Activity Summary */}
            <div>
              <h3 className="text-orange-500 font-crimson text-2xl font-bold mb-4">
                분기 활동 요약
              </h3>

              <div className="space-y-4">
                {/* Call Count */}
                <div className="flex items-center justify-between p-5 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19.95 21C17.8667 21 15.8083 20.5458 13.775 19.6375C11.7417 18.7292 9.89167 17.4417 8.225 15.775C6.55833 14.1083 5.27083 12.2583 4.3625 10.225C3.45417 8.19167 3 6.13333 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07917 8.725 3.2375C8.90833 3.39583 9.01667 3.58333 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.70417 12.1125 8.1625 12.6875C8.62083 13.2625 9.125 13.8167 9.675 14.35C10.1917 14.8667 10.7333 15.3458 11.3 15.7875C11.8667 16.2292 12.4667 16.6333 13.1 17L15.45 14.65C15.6 14.5 15.7958 14.3875 16.0375 14.3125C16.2792 14.2375 16.5167 14.2167 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1375 20.775 15.3125C20.925 15.4875 21 15.6833 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z"
                        fill="#3C3F3D"
                      />
                    </svg>
                    <span className="text-gray-800 font-crimson text-xl font-semibold">
                      통화 횟수
                    </span>
                  </div>
                  <span className="text-gray-800 font-crimson text-xl">
                    {stats.quarterlyStats.callCount}회
                  </span>
                </div>

                {/* Call Time */}
                <div className="flex items-center justify-between p-5 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M13 11.6V8C13 7.71667 12.9042 7.47917 12.7125 7.2875C12.5208 7.09583 12.2833 7 12 7C11.7167 7 11.4792 7.09583 11.2875 7.2875C11.0958 7.47917 11 7.71667 11 8V11.975C11 12.1083 11.025 12.2375 11.075 12.3625C11.125 12.4875 11.2 12.6 11.3 12.7L14.6 16C14.7833 16.1833 15.0167 16.275 15.3 16.275C15.5833 16.275 15.8167 16.1833 16 16C16.1833 15.8167 16.275 15.5833 16.275 15.3C16.275 15.0167 16.1833 14.7833 16 14.6L13 11.6ZM12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22Z"
                        fill="#3C3F3D"
                      />
                    </svg>
                    <span className="text-gray-800 font-crimson text-xl font-semibold">
                      통화 시간
                    </span>
                  </div>
                  <span className="text-gray-800 font-crimson text-xl">
                    {formatDuration(stats.quarterlyStats.totalDurationMinutes)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeItem={getActiveItem()}
        onItemClick={handleBottomNavClick}
      />
    </div>
  );
}
