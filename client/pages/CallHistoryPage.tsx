import { useEffect, useState } from "react";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken } from "@/lib/auth";
import { CallHistoryItem } from "@shared/api";
import { logger } from "@/lib/logger";

interface CallHistoryPageProps {
  onBack: () => void;
}

export default function CallHistoryPage({ onBack }: CallHistoryPageProps) {
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  // 통화 이력 조회
  const fetchCallHistory = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const matchingApi = getMatchingApiService();
      const token = getStoredToken();

      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      matchingApi.setToken(token);
      const data = await matchingApi.getCallHistory({
        page,
        limit: 20,
        period: "all",
      });

      setCalls(data.calls);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setHasNext(data.pagination.hasNext);
    } catch (err) {
      logger.error("통화 이력 조회 실패:", err);
      setError(
        err instanceof Error ? err.message : "통화 이력을 불러올 수 없습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCallHistory(1);
  }, []);

  // 날짜 포맷 (2025-10-15T10:00:00Z → 10/15 10:00)
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // 분 단위를 "X시간 Y분" 형식으로 변환
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return "1분 미만";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchCallHistory(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          통화 기록
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
                통화 기록을 불러오는 중...
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
                onClick={() => fetchCallHistory(currentPage)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-pretendard"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 통화 이력 리스트 */}
        {!isLoading && !error && (
          <>
            {calls.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-500 font-pretendard text-lg">
                    아직 통화 기록이 없습니다
                  </p>
                  <p className="text-gray-400 font-pretendard text-sm mt-2">
                    첫 통화를 시작해보세요!
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {calls.map((call) => (
                    <div
                      key={call.callId}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      {/* 상단: 상대방 정보 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                                fill="#EE9049"
                              />
                            </svg>
                          </div>
                          <div className="ml-1">
                            <p className="text-gray-800 font-crimson text-lg font-semibold">
                              {call.partnerNickname}
                            </p>
                            <p className="text-gray-500 font-pretendard text-xs">
                              {formatDateTime(call.startedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-500 font-crimson text-base font-semibold">
                            {formatDuration(call.durationMinutes)}
                          </p>
                        </div>
                      </div>

                      {/* 하단: 카테고리 */}
                      <div className="flex items-center gap-2 ml-[52px]">
                        <div className="px-3 py-1 bg-white rounded-full border border-orange-200">
                          <span className="text-orange-500 font-pretendard text-sm">
                            {call.categoryName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg font-pretendard ${
                        currentPage === 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }`}
                    >
                      이전
                    </button>
                    <span className="text-gray-700 font-pretendard">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNext}
                      className={`px-4 py-2 rounded-lg font-pretendard ${
                        !hasNext
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }`}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
