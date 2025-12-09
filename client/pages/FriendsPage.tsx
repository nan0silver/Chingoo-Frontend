import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken, getStoredUserInfo } from "@/lib/auth";
import { Friend } from "@shared/api";
import { formatLastCallTime } from "@/lib/dateUtils";
import FriendRequestModal from "@/components/FriendRequestModal";
import { Plus, Trash2, X, Inbox, Send } from "lucide-react";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";

interface FriendsPageProps {
  onBack: () => void;
  onNavigateToRequests?: () => void;
}

export default function FriendsPage({
  onBack,
  onNavigateToRequests,
}: FriendsPageProps) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [deletingFriendId, setDeletingFriendId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<{
    id: number;
    nickname: string;
  } | null>(null);
  const [receivedRequestCount, setReceivedRequestCount] = useState<number>(0);
  const [sentRequestCount, setSentRequestCount] = useState<number>(0);

  // 친구 목록 및 요청 개수 조회
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const matchingApi = getMatchingApiService();
        const token = getStoredToken();
        const userInfo = getStoredUserInfo();

        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }

        matchingApi.setToken(token);
        const data = await matchingApi.getFriends();

        // 마지막 통화 시간 기준으로 정렬 (최근 통화한 친구가 위로)
        // null인 경우는 맨 아래로 정렬
        const sortedFriends = data.sort((a, b) => {
          if (!a.lastCallAt && !b.lastCallAt) return 0;
          if (!a.lastCallAt) return 1; // a가 null이면 뒤로
          if (!b.lastCallAt) return -1; // b가 null이면 뒤로
          const dateA = new Date(a.lastCallAt).getTime();
          const dateB = new Date(b.lastCallAt).getTime();
          return dateB - dateA; // 내림차순 정렬
        });

        setFriends(sortedFriends);

        // 친구 요청 개수 조회
        if (userInfo?.id) {
          try {
            // getFriendRequests()는 이미 받은 요청만 반환하므로 필터링 불필요
            const receivedRequests = await matchingApi.getFriendRequests();
            const pendingReceived = receivedRequests.filter(
              (req) => req.status === "PENDING",
            );
            setReceivedRequestCount(pendingReceived.length);

            // 보낸 요청 개수 조회
            const sentRequests = await matchingApi.getSentFriendRequests(
              userInfo.id,
            );
            setSentRequestCount(sentRequests.length);
          } catch (reqErr) {
            console.error("친구 요청 개수 조회 실패:", reqErr);
            // 요청 개수 조회 실패해도 친구 목록은 표시
          }
        }

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

  // 친구 요청 전송
  const handleSendFriendRequest = async (nickname: string) => {
    const matchingApi = getMatchingApiService();
    const token = getStoredToken();

    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }

    matchingApi.setToken(token);
    await matchingApi.sendFriendRequest({ nickname });

    // 성공 시 친구 목록 새로고침
    const data = await matchingApi.getFriends();
    const sortedFriends = data.sort((a, b) => {
      if (!a.lastCallAt && !b.lastCallAt) return 0;
      if (!a.lastCallAt) return 1;
      if (!b.lastCallAt) return -1;
      const dateA = new Date(a.lastCallAt).getTime();
      const dateB = new Date(b.lastCallAt).getTime();
      return dateB - dateA;
    });
    setFriends(sortedFriends);
  };

  // 친구 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (friendId: number, friendNickname: string) => {
    if (!friendId || friendId === undefined) {
      console.error("친구 ID가 유효하지 않습니다:", friendId);
      alert("친구 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.");
      return;
    }
    setFriendToDelete({ id: friendId, nickname: friendNickname });
    setDeleteDialogOpen(true);
  };

  // 친구 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!friendToDelete) return;

    // friendId 유효성 검사
    if (!friendToDelete.id || friendToDelete.id === undefined) {
      console.error("삭제할 친구 ID가 유효하지 않습니다:", friendToDelete);
      alert("친구 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.");
      setDeleteDialogOpen(false);
      setFriendToDelete(null);
      return;
    }

    try {
      setDeletingFriendId(friendToDelete.id);
      const matchingApi = getMatchingApiService();
      const token = getStoredToken();

      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      matchingApi.setToken(token);

      if (import.meta.env.DEV) {
        console.log("🗑️ 친구 삭제 요청:", {
          friendId: friendToDelete.id,
          friend: friendToDelete,
        });
      }

      await matchingApi.deleteFriend(friendToDelete.id);

      // 성공 시 친구 목록에서 제거
      setFriends((prevFriends) =>
        prevFriends.filter((f) => f.id !== friendToDelete.id),
      );

      // 다이얼로그 닫기
      setDeleteDialogOpen(false);
      setFriendToDelete(null);
    } catch (err) {
      console.error("친구 삭제 실패:", err);
      alert(
        err instanceof Error
          ? err.message
          : "친구 삭제에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setDeletingFriendId(null);
    }
  };

  return (
    <div className="min-h-screen bg-grey-50 flex flex-col safe-area-page font-noto pb-20">
      {/* Friend Request Modal */}
      <FriendRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleSendFriendRequest}
      />

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
          onClick={() => {
            if (deletingFriendId === null) {
              setDeleteDialogOpen(false);
              setFriendToDelete(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-grey-900 font-cafe24">
                친구 삭제
              </h2>
              <button
                onClick={() => {
                  if (deletingFriendId === null) {
                    setDeleteDialogOpen(false);
                    setFriendToDelete(null);
                  }
                }}
                disabled={deletingFriendId !== null}
                className="p-1 hover:bg-grey-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="닫기"
              >
                <X className="w-6 h-6 text-grey-400" />
              </button>
            </div>

            {/* Description */}
            {friendToDelete && (
              <div className="mb-6">
                <p className="text-grey-600 font-pretendard text-sm md:text-base mb-2">
                  {friendToDelete.nickname}님과의 친구 관계를 삭제하시겠습니까?
                </p>
                <p className="text-grey-500 font-pretendard text-sm md:text-base">
                  양쪽 모두 친구 목록에서 삭제됩니다.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deletingFriendId === null) {
                    setDeleteDialogOpen(false);
                    setFriendToDelete(null);
                  }
                }}
                disabled={deletingFriendId !== null}
                className="flex-1 h-12 border-2 border-grey-100 text-grey-900 font-crimson text-lg font-semibold rounded-lg hover:bg-grey-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingFriendId !== null}
                className="flex-1 h-12 bg-red-500 text-white font-crimson text-lg font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingFriendId !== null ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-2">
          {/* 받은 요청 버튼 */}
          <button
            onClick={() => navigate("/friends/requests/received")}
            className="relative p-2 hover:bg-grey-50 rounded-lg transition-colors"
            title="받은 친구 요청"
          >
            <Inbox className="w-6 h-6 text-orange-accent" strokeWidth={2} />
            {receivedRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {receivedRequestCount > 9 ? "9+" : receivedRequestCount}
              </span>
            )}
          </button>
          {/* 보낸 요청 버튼 */}
          <button
            onClick={() => navigate("/friends/requests/sent")}
            className="relative p-2 hover:bg-grey-50 rounded-lg transition-colors"
            title="보낸 친구 요청"
          >
            <Send className="w-6 h-6 text-orange-accent" strokeWidth={2} />
            {sentRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {sentRequestCount > 9 ? "9+" : sentRequestCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto pb-32">
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
            {friends.map((friend, index) => (
              <div
                key={friend.id ?? `friend-${index}`}
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-grey-400 font-crimson text-sm">
                        {formatLastCallTime(friend.lastCallAt)}
                      </p>
                      {friend.lastCallAt &&
                        friend.lastCallCategoryName &&
                        friend.lastCallCategoryName.trim() !== "" && (
                          <span className="bg-orange-50 text-orange-accent font-crimson text-xs font-medium px-2 py-0.5 rounded-md">
                            {friend.lastCallCategoryName}
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleDeleteClick(friend.id, friend.nickname)}
                  disabled={deletingFriendId === friend.id}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="친구 삭제"
                >
                  {deletingFriendId === friend.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-500 border-t-transparent"></div>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Friend Button */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-30">
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="w-full h-16 rounded-lg font-crimson text-2xl font-semibold text-white transition-all bg-gradient-to-r from-yellow-300 to-red-gradient shadow-lg"
        >
          친구 추가
        </button>
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
              // 이미 친구 목록 페이지에 있음
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
