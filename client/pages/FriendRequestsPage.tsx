import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken, getStoredUserInfo } from "@/lib/auth";
import { FriendRequest } from "@shared/api";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";

interface FriendRequestsPageProps {
  onBack: () => void;
  onRequestHandled?: () => void; // 요청 처리 후 친구 목록 새로고침을 위한 콜백
}

export default function FriendRequestsPage({
  onBack,
  onRequestHandled,
}: FriendRequestsPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // 현재 경로에 따라 받은 요청인지 보낸 요청인지 판단
  const isReceivedRequests = location.pathname.includes("/received");
  const isSentRequests = location.pathname.includes("/sent");

  // 친구 요청 목록 조회
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const matchingApi = getMatchingApiService();
      const token = getStoredToken();
      const userInfo = getStoredUserInfo();

      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      if (!userInfo?.id) {
        throw new Error("사용자 정보를 불러올 수 없습니다.");
      }

      matchingApi.setToken(token);
      let data: FriendRequest[];

      if (isSentRequests) {
        // 보낸 요청 조회
        data = await matchingApi.getSentFriendRequests(userInfo.id);
      } else {
        // 받은 요청 조회 (getFriendRequests()는 이미 받은 요청만 반환)
        data = await matchingApi.getFriendRequests();
      }

      // PENDING 상태만 필터링 (수락/거절된 요청은 제외)
      const pendingRequests = data.filter(
        (req) => req.status === "PENDING",
      );

      // 최신 요청이 위로 오도록 정렬
      const sortedRequests = pendingRequests.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // 내림차순 정렬
      });

      setRequests(sortedRequests);

      if (import.meta.env.DEV) {
        console.log(
          isSentRequests ? "📤 보낸 친구 요청 목록:" : "📬 받은 친구 요청 목록:",
          sortedRequests,
        );
      }
    } catch (err) {
      console.error("친구 요청 목록 조회 실패:", err);
      setError(
        err instanceof Error
          ? err.message
          : "친구 요청 목록을 불러올 수 없습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [location.pathname]);

  // 친구 요청 수락
  const handleAccept = async (friendshipId: number) => {
    if (processingIds.has(friendshipId)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(friendshipId));

      const matchingApi = getMatchingApiService();
      const token = getStoredToken();

      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      matchingApi.setToken(token);
      await matchingApi.acceptFriendRequest(friendshipId);

      // 요청 목록에서 제거
      setRequests((prev) => prev.filter((req) => req.id !== friendshipId));

      // 친구 목록 새로고침 콜백 호출
      onRequestHandled?.();
    } catch (err) {
      console.error("친구 요청 수락 실패:", err);
      alert(
        err instanceof Error
          ? err.message
          : "친구 요청을 수락할 수 없습니다.",
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  // 친구 요청 거절
  const handleReject = async (friendshipId: number) => {
    if (processingIds.has(friendshipId)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(friendshipId));

      const matchingApi = getMatchingApiService();
      const token = getStoredToken();

      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      matchingApi.setToken(token);
      await matchingApi.rejectFriendRequest(friendshipId);

      // 요청 목록에서 제거
      setRequests((prev) => prev.filter((req) => req.id !== friendshipId));
    } catch (err) {
      console.error("친구 요청 거절 실패:", err);
      alert(
        err instanceof Error
          ? err.message
          : "친구 요청을 거절할 수 없습니다.",
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  // 보낸 친구 요청 취소
  const handleCancel = async (friendshipId: number) => {
    if (processingIds.has(friendshipId)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(friendshipId));

      const matchingApi = getMatchingApiService();
      const token = getStoredToken();

      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      matchingApi.setToken(token);
      // 보낸 요청 취소는 DELETE /api/v1/friendships/requests/{friendshipId} 사용
      await matchingApi.cancelSentFriendRequest(friendshipId);

      // 요청 목록에서 제거
      setRequests((prev) => prev.filter((req) => req.id !== friendshipId));
    } catch (err) {
      console.error("친구 요청 취소 실패:", err);
      alert(
        err instanceof Error
          ? err.message
          : "친구 요청을 취소할 수 없습니다.",
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

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
            {isSentRequests ? "보낸 친구 요청" : "받은 친구 요청"}
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
                onClick={fetchRequests}
                className="text-orange-accent font-crimson text-base underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-grey-900 font-crimson text-lg">
                {isSentRequests
                  ? "보낸 친구 요청이 없습니다."
                  : "받은 친구 요청이 없습니다."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const isProcessing = processingIds.has(request.id);
              // 받은 요청인지 보낸 요청인지에 따라 표시할 닉네임 결정
              const displayNickname = isSentRequests
                ? request.receiverNickname || ""
                : request.requesterNickname || "";

              return (
                <div
                  key={request.id}
                  className="bg-white border border-grey-100 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {/* 프로필 아이콘 */}
                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-accent font-crimson text-lg font-bold">
                        {displayNickname && displayNickname.length > 0
                          ? displayNickname.charAt(0)
                          : "?"}
                      </span>
                    </div>

                    {/* 요청 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-grey-900 font-crimson text-lg font-semibold truncate">
                        {displayNickname}
                      </h3>
                      <p className="text-grey-400 font-crimson text-sm mt-1">
                        {isSentRequests
                          ? "친구 요청을 보냈습니다"
                          : "친구 요청을 보냈습니다"}
                      </p>
                    </div>
                  </div>

                  {/* 액션 버튼 - 보낸 요청은 취소만, 받은 요청은 수락/거절 */}
                  {isSentRequests ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCancel(request.id)}
                        disabled={isProcessing}
                        className="w-full h-10 border-2 border-grey-100 text-grey-900 font-crimson text-base font-semibold rounded-lg hover:bg-grey-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? "처리 중..." : "요청 취소"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={isProcessing}
                        className="flex-1 h-10 border-2 border-grey-100 text-grey-900 font-crimson text-base font-semibold rounded-lg hover:bg-grey-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? "처리 중..." : "거절"}
                      </button>
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={isProcessing}
                        className="flex-1 h-10 bg-orange-accent text-white font-crimson text-base font-semibold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? "처리 중..." : "수락"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeItem="friends"
        onItemClick={(item) => {
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
        }}
      />
    </div>
  );
}

