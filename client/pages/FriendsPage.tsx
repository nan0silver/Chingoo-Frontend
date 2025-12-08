import { useEffect, useState } from "react";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken } from "@/lib/auth";
import { Friend } from "@shared/api";
import { formatLastCallTime } from "@/lib/dateUtils";

interface FriendsPageProps {
  onBack: () => void;
}

export default function FriendsPage({ onBack }: FriendsPageProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 친구 목록 조회
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const matchingApi = getMatchingApiService();
        const token = getStoredToken();

        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }

        matchingApi.setToken(token);
        const data = await matchingApi.getFriends();

        // 마지막 통화 시간 기준으로 정렬 (최근 통화한 친구가 위로)
        const sortedFriends = data.sort((a, b) => {
          const dateA = new Date(a.lastCallAt).getTime();
          const dateB = new Date(b.lastCallAt).getTime();
          return dateB - dateA; // 내림차순 정렬
        });

        setFriends(sortedFriends);

        if (import.meta.env.DEV) {
          console.log("👥 친구 목록:", sortedFriends);
        }
      } catch (err) {
        console.error("친구 목록 조회 실패:", err);
        setError(
          err instanceof Error
            ? err.message
            : "친구 목록을 불러올 수 없습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, []);

  return (
    <div className="min-h-screen bg-grey-50 flex flex-col safe-area-page font-noto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-grey-100">
        <div className="flex items-center gap-3">
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
          <h1 className="text-2xl font-bold text-grey-900 font-cafe24">
            친구 목록
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-accent border-t-transparent mx-auto mb-4"></div>
              <p className="text-grey-900 font-crimson text-lg">로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 font-crimson text-lg mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-orange-accent font-crimson text-base underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : friends.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-grey-900 font-crimson text-lg">
                아직 친구가 없습니다.
              </p>
              <p className="text-grey-400 font-crimson text-sm mt-2">
                통화를 시작하여 친구를 만들어보세요!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-white border border-grey-100 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 프로필 아이콘 */}
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-accent font-crimson text-lg font-bold">
                      {friend.nickname.charAt(0)}
                    </span>
                  </div>

                  {/* 친구 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-grey-900 font-crimson text-lg font-semibold truncate">
                      {friend.nickname}
                    </h3>
                    <p className="text-grey-400 font-crimson text-sm mt-1">
                      {formatLastCallTime(friend.lastCallAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
