import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCall } from "@/lib/useCall";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";
import { ReportUserRequest } from "@shared/api";
import ReportUserModal from "@/components/ReportUserModal";

interface CallEvaluationPageProps {
  selectedCategory: string | null;
  onCallAgain: () => void;
  onSelectInterests: () => void;
  onGoHome: () => void;
}

export default function CallEvaluationPage({
  selectedCategory,
  onCallAgain,
  onSelectInterests,
  onGoHome,
}: CallEvaluationPageProps) {
  const [selectedRating, setSelectedRating] = useState<"good" | "bad" | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendRequestStatus, setFriendRequestStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [friendRequestMessage, setFriendRequestMessage] = useState<string>("");
  const [showFriendRequestModal, setShowFriendRequestModal] = useState(false);
  const [showEvaluationErrorModal, setShowEvaluationErrorModal] =
    useState(false);
  const [evaluationErrorMessage, setEvaluationErrorMessage] =
    useState<string>("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportSuccessModal, setShowReportSuccessModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { partner, clearPartner, callId } = useCall();
  const matchingApiService = getMatchingApiService();

  // 신고한 사용자 목록을 localStorage에서 가져오기
  const getReportedUserIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem("reportedUserIds");
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        return new Set(ids);
      }
    } catch (error) {
      console.error("신고한 사용자 목록 불러오기 실패:", error);
    }
    return new Set<string>();
  };

  // 신고한 사용자 ID를 localStorage에 저장
  const addReportedUserId = (userId: string) => {
    try {
      const currentIds = getReportedUserIds();
      currentIds.add(userId);
      localStorage.setItem(
        "reportedUserIds",
        JSON.stringify(Array.from(currentIds)),
      );
    } catch (error) {
      console.error("신고한 사용자 목록 저장 실패:", error);
    }
  };

  // 신고된 사용자인지 확인
  const isReportedUser = (userId: string | undefined): boolean => {
    if (!userId) return false;
    return getReportedUserIds().has(userId);
  };

  // 디버깅: partner 정보 및 callId 확인 (개발 환경만)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🔍 CallEvaluationPage - partner 정보:", partner);
      console.log("🔍 CallEvaluationPage - callId:", callId);
    }
  }, [partner, callId]);

  // 친구 추가 함수
  const handleAddFriend = async () => {
    if (!partner?.nickname) {
      alert("상대방 정보를 찾을 수 없습니다.");
      return;
    }

    setIsAddingFriend(true);
    setFriendRequestStatus("idle");
    setFriendRequestMessage("");

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      }

      matchingApiService.setToken(token);

      await matchingApiService.sendFriendRequest({
        nickname: partner.nickname,
      });

      if (import.meta.env.DEV) {
        console.log("✅ 친구 요청 전송 성공");
      }

      setFriendRequestStatus("success");
      setFriendRequestMessage("친구 요청을 보냈습니다!");
      setShowFriendRequestModal(true);
    } catch (error: any) {
      console.error("❌ 친구 요청 전송 실패:", error);

      // 에러 메시지 처리
      let errorMessage = "친구 요청을 보낼 수 없습니다.";
      let isAlreadyFriend = false;
      let isAlreadyRequested = false;
      let receivedRequestFromPartner = false;

      if (error?.message) {
        const message = error.message.toLowerCase();

        // 상대방이 이미 요청을 보낸 경우 (가장 구체적인 메시지부터 체크)
        if (
          message.includes("해당 사용자로부터 이미 친구 요청을 받았습니다") ||
          message.includes("이미 친구 요청을 받았습니다") ||
          message.includes("받은 요청") ||
          message.includes("receiver") ||
          message.includes("from")
        ) {
          errorMessage =
            "상대방이 이미 친구 요청을 보냈습니다.\n받은 친구 요청에서 확인해주세요.";
          receivedRequestFromPartner = true;
        }
        // 이미 요청을 보낸 경우
        else if (
          message.includes("이미 친구 요청을 보냈습니다") ||
          message.includes("이미 요청") ||
          message.includes("already requested") ||
          message.includes("pending")
        ) {
          errorMessage = "이미 친구 요청을 보냈습니다.";
          isAlreadyRequested = true;
        }
        // 동시 요청 (409 Conflict)
        else if (message.includes("409") || message.includes("conflict")) {
          errorMessage =
            "상대방이 동시에 친구 요청을 보냈습니다. 받은 친구 요청에서 확인해주세요.";
          receivedRequestFromPartner = true;
        }
        // 이미 친구인 경우 (더 일반적인 메시지는 나중에 체크)
        else if (
          message.includes("이미 친구") ||
          message.includes("already friend") ||
          message.includes("already exists")
        ) {
          errorMessage = "이미 친구입니다.";
          isAlreadyFriend = true;
        }
        // 차단된 사용자 (신고된 사용자)
        else if (
          message.includes("차단") ||
          message.includes("blocked") ||
          message.includes("신고") ||
          message.includes("report") ||
          message.includes("매칭되지 않") ||
          message.includes("cannot match")
        ) {
          errorMessage = "차단된 사용자에게는 친구 요청을 보낼 수 없습니다.";
          // 신고된 사용자로 표시하여 버튼 숨김
          if (partner?.id) {
            addReportedUserId(partner.id);
          }
        }
        // 기타 에러는 서버 메시지 사용
        else {
          errorMessage = error.message || errorMessage;
        }
      }

      setFriendRequestStatus(
        isAlreadyFriend || isAlreadyRequested || receivedRequestFromPartner
          ? "success"
          : "error",
      );
      setFriendRequestMessage(errorMessage);
      setShowFriendRequestModal(true);
    } finally {
      setIsAddingFriend(false);
    }
  };

  // 평가 제출 함수
  const handleSubmitEvaluation = async () => {
    if (!selectedRating || !callId) {
      console.error("평가 정보 또는 callId가 없습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const evaluationData = {
        call_id: parseInt(callId),
        feedback_type:
          selectedRating === "good"
            ? "POSITIVE"
            : ("NEGATIVE" as "POSITIVE" | "NEGATIVE"),
        negative: selectedRating === "bad",
        positive: selectedRating === "good",
      };

      if (import.meta.env.DEV) {
        console.log("📤 평가 제출 시작:", evaluationData);
      }

      // 토큰 설정 (갱신된 토큰 포함)
      const token = getStoredToken();
      if (token) {
        matchingApiService.setToken(token);
        if (import.meta.env.DEV) {
          console.log("🔑 matchingApiService에 토큰 설정 완료");
        }
      } else {
        throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      }

      await matchingApiService.submitEvaluation(evaluationData);
      if (import.meta.env.DEV) {
        console.log("✅ 평가 제출 성공");
      }

      // 성공 모달 표시
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("❌ 평가 제출 실패:", error);

      // 에러 메시지 처리
      let errorMessage = "평가 제출에 실패했습니다. 다시 시도해주세요.";

      if (error?.message) {
        const message = error.message.toLowerCase();

        // 이미 평가를 완료한 경우
        if (
          message.includes("이미 평가를 완료했습니다") ||
          message.includes("already evaluated") ||
          message.includes("already completed")
        ) {
          errorMessage = "이미 평가를 완료했습니다.";
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      setEvaluationErrorMessage(errorMessage);
      setShowEvaluationErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 사용자 신고 핸들러
  const handleReportUser = async (request: ReportUserRequest) => {
    if (!partner?.id) {
      throw new Error("상대방 정보를 찾을 수 없습니다.");
    }

    const token = getStoredToken();
    if (!token) {
      throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
    }

    matchingApiService.setToken(token);

    // call_id 추가 (통화 종료 후이므로 callId가 있으면 포함)
    const reportRequest: ReportUserRequest = {
      ...request,
      call_id: callId ? parseInt(callId) : undefined,
    };

    await matchingApiService.reportUser(partner.id, reportRequest);
    
    // 신고한 사용자 ID를 localStorage에 저장
    addReportedUserId(partner.id);
    
    setShowReportSuccessModal(true);
  };

  // 하단 네비게이션 핸들러
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
  const getActiveItem = (): BottomNavItem | null => {
    // 통화 평가 페이지에서는 아무 버튼도 활성화하지 않음
    return null;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative safe-area-page font-noto pb-20">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="text-green-600"
              >
                <path
                  d="M26.6667 8L11.3333 23.3333L5.33334 17.3333"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              평가가 제출되었습니다!
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedRating === "good" ? "좋았어요" : "별로였어요"}로
              평가되었습니다.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Friend Request Modal */}
      {showFriendRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center">
            {friendRequestMessage === "이미 친구입니다." ||
            friendRequestMessage === "이미 친구 요청을 보냈습니다." ||
            friendRequestMessage ===
              "상대방이 이미 친구 요청을 보냈습니다.\n받은 친구 요청에서 확인해주세요." ||
            friendRequestMessage ===
              "상대방이 동시에 친구 요청을 보냈습니다.\n받은 친구 요청에서 확인해주세요." ? (
              // 이미 친구인 경우, 이미 요청을 보낸 경우, 또는 상대방이 이미 요청을 보낸 경우: 초록색 체크 아이콘과 메시지만 표시
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    className="text-green-600"
                  >
                    <path
                      d="M26.6667 8L11.3333 23.3333L5.33334 17.3333"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-gray-900 font-crimson text-lg font-bold mb-6 whitespace-pre-line">
                  {friendRequestMessage}
                </p>
                <div className="flex flex-col gap-2">
                  {(friendRequestMessage ===
                    "상대방이 이미 친구 요청을 보냈습니다.\n받은 친구 요청에서 확인해주세요." ||
                    friendRequestMessage ===
                      "상대방이 동시에 친구 요청을 보냈습니다.\n받은 친구 요청에서 확인해주세요.") && (
                    <button
                      onClick={() => {
                        setShowFriendRequestModal(false);
                        navigate("/friends/requests/received");
                      }}
                      className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      받은 친구 요청 보기
                    </button>
                  )}
                  <button
                    onClick={() => setShowFriendRequestModal(false)}
                    className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              // 기타 경우: 기존 로직 유지
              <>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    friendRequestStatus === "success"
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  {friendRequestStatus === "success" ? (
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="text-green-600"
                    >
                      <path
                        d="M26.6667 8L11.3333 23.3333L5.33334 17.3333"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="text-red-600"
                    >
                      <path
                        d="M24 8L8 24M8 8L24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <h3
                  className={`text-xl font-bold mb-2 ${
                    friendRequestStatus === "success"
                      ? "text-gray-900"
                      : "text-red-600"
                  }`}
                >
                  {friendRequestStatus === "success"
                    ? "친구 요청 완료"
                    : "친구 요청 실패"}
                </h3>
                <p className="text-gray-600 mb-6">{friendRequestMessage}</p>
                <button
                  onClick={() => setShowFriendRequestModal(false)}
                  className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Error Modal */}
      {showEvaluationErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center">
            {evaluationErrorMessage === "이미 평가를 완료했습니다." ? (
              // 이미 평가 완료한 경우: 초록색 체크 아이콘과 메시지만 표시
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    className="text-green-600"
                  >
                    <path
                      d="M26.6667 8L11.3333 23.3333L5.33334 17.3333"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-gray-900 font-crimson text-lg font-bold mb-6">
                  {evaluationErrorMessage}
                </p>
                <button
                  onClick={() => setShowEvaluationErrorModal(false)}
                  className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  확인
                </button>
              </>
            ) : (
              // 기타 에러: 빨간색 X 아이콘과 에러 메시지 표시
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    className="text-red-600"
                  >
                    <path
                      d="M24 8L8 24M8 8L24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2 text-red-600">
                  평가 제출 실패
                </h3>
                <p className="text-gray-600 mb-6">{evaluationErrorMessage}</p>
                <button
                  onClick={() => setShowEvaluationErrorModal(false)}
                  className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-center mt-8">
        <h1 className="text-orange-500 font-crimson text-2xl font-bold">
          통화를 평가해주세요
        </h1>
      </div>

      {/* Title Container */}
      <div className="flex flex-col items-center justify-center mt-8 gap-3">
        <div className="flex items-center gap-1">
          <span className="text-gray-900 font-crimson text-4xl font-bold">
            {partner?.nickname || "상대방"}
          </span>
          <span className="text-gray-900 font-pretendard text-4xl font-normal">
            님과의
          </span>
        </div>
        <span className="text-gray-900 font-pretendard text-4xl font-normal">
          통화는 어땠나요?
        </span>
      </div>

      {/* Rating Options */}
      <div className="flex gap-4 px-5 mt-12">
        {/* Bad Rating */}
        <button
          onClick={() => setSelectedRating("bad")}
          className={`flex-1 h-36 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
            selectedRating === "bad"
              ? "border-orange-400 bg-orange-50"
              : "border-gray-300 bg-gray-100"
          }`}
        >
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path
              d="M7.5 40C6.16667 40 5 39.5 4 38.5C3 37.5 2.5 36.3333 2.5 35V30C2.5 29.7083 2.53125 29.3958 2.59375 29.0625C2.65625 28.7292 2.75 28.4167 2.875 28.125L10.375 10.5C10.75 9.66667 11.375 8.95833 12.25 8.375C13.125 7.79167 14.0417 7.5 15 7.5H35C36.375 7.5 37.5521 7.98958 38.5312 8.96875C39.5104 9.94792 40 11.125 40 12.5V37.9375C40 38.6042 39.8646 39.2396 39.5938 39.8438C39.3229 40.4479 38.9583 40.9792 38.5 41.4375L24.9375 54.9375C24.3125 55.5208 23.5729 55.875 22.7188 56C21.8646 56.125 21.0417 55.9792 20.25 55.5625C19.4583 55.1458 18.8854 54.5625 18.5312 53.8125C18.1771 53.0625 18.1042 52.2917 18.3125 51.5L21.125 40H7.5ZM50 7.5C51.375 7.5 52.5521 7.98958 53.5312 8.96875C54.5104 9.94792 55 11.125 55 12.5V35C55 36.375 54.5104 37.5521 53.5312 38.5313C52.5521 39.5104 51.375 40 50 40C48.625 40 47.4479 39.5104 46.4688 38.5313C45.4896 37.5521 45 36.375 45 35V12.5C45 11.125 45.4896 9.94792 46.4688 8.96875C47.4479 7.98958 48.625 7.5 50 7.5Z"
              fill="url(#paint0_radial_bad)"
            />
            <defs>
              <radialGradient
                id="paint0_radial_bad"
                cx="0"
                cy="0"
                r="1"
                gradientTransform="matrix(36 -44 104.92 102.906 15.5 59.5)"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#5D5D5D" />
                <stop offset="1" stopColor="#9E9B9B" />
              </radialGradient>
            </defs>
          </svg>
          <span className="text-gray-900 font-crimson text-2xl font-bold">
            별로였어요
          </span>
        </button>

        {/* Good Rating */}
        <button
          onClick={() => setSelectedRating("good")}
          className={`flex-1 h-36 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
            selectedRating === "good"
              ? "border-orange-400 bg-orange-50"
              : "border-gray-300 bg-gray-100"
          }`}
        >
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path
              d="M27.3539 51.2033C28.9615 52.2656 31.037 52.2656 32.6446 51.2033C37.7481 47.8307 48.8704 39.7751 53.6589 30.7582C59.9748 18.8635 52.558 7 42.7566 7C37.1687 7 33.8065 9.91945 31.9478 12.4288C30.9687 13.7511 29.0328 13.7511 28.0522 12.4288C26.1935 9.91945 22.8313 7 17.2434 7C7.44202 7 0.0252047 18.8635 6.34108 30.7582C11.1281 39.7736 22.2504 47.8307 27.3539 51.2033Z"
              fill="url(#paint0_radial_good)"
            />
            <defs>
              <radialGradient
                id="paint0_radial_good"
                cx="0"
                cy="0"
                r="1"
                gradientTransform="matrix(-18.5 26.5 -68.601 -50.7338 45.5 16.5)"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#E35241" />
                <stop offset="1" stopColor="#FF8B76" />
              </radialGradient>
            </defs>
          </svg>
          <span className="text-gray-900 font-crimson text-2xl font-bold">
            좋았어요
          </span>
        </button>
      </div>

      {/* Privacy Note */}
      <div className="flex justify-center mt-8">
        <p className="text-gray-500 font-crimson text-xl">
          평가는 상대방에게 공개되지 않아요
        </p>
      </div>

      {/* Submit Rating Button */}
      <div className="flex justify-center mt-6 px-5">
        <button
          onClick={handleSubmitEvaluation}
          disabled={!selectedRating || isSubmitting}
          className={`w-full max-w-sm h-14 rounded-lg font-crimson text-xl font-bold transition-all ${
            selectedRating && !isSubmitting
              ? "bg-gradient-to-r from-yellow-300 to-red-gradient text-white hover:opacity-90"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "제출 중..." : "평가 제출하기"}
        </button>
      </div>

      {/* Add Friend Button */}
      {partner?.nickname && !isReportedUser(partner.id) && (
        <div className="flex justify-center mt-4 px-5">
          <button
            onClick={handleAddFriend}
            disabled={isAddingFriend}
            className={`w-full max-w-sm h-14 rounded-lg font-crimson text-xl font-bold transition-all flex items-center justify-center gap-2 ${
              !isAddingFriend
                ? "bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isAddingFriend ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>요청 중...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" strokeWidth={2} />
                <span>친구 추가</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Report User Button */}
      {partner?.nickname && (
        <div className="flex justify-center mt-3 px-5 mb-24">
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full max-w-sm h-14 rounded-lg font-crimson text-xl font-bold transition-all flex items-center justify-center gap-2 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5"
            >
              <path
                d="M10 1.25C5.17 1.25 1.25 5.17 1.25 10C1.25 14.83 5.17 18.75 10 18.75C14.83 18.75 18.75 14.83 18.75 10C18.75 5.17 14.83 1.25 10 1.25ZM10 15C9.3 15 8.75 14.45 8.75 13.75C8.75 13.05 9.3 12.5 10 12.5C10.7 12.5 11.25 13.05 11.25 13.75C11.25 14.45 10.7 15 10 15ZM11.25 10.75H8.75V5.75H11.25V10.75Z"
                fill="currentColor"
              />
            </svg>
            <span>신고하기</span>
          </button>
        </div>
      )}

      {/* Report User Modal */}
      <ReportUserModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportUser}
        reportedUserNickname={partner?.nickname}
      />

      {/* Report Success Modal */}
      {showReportSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="text-green-600"
              >
                <path
                  d="M26.6667 8L11.3333 23.3333L5.33334 17.3333"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              신고가 접수되었습니다
            </h3>
            <p className="text-gray-600 mb-6">
              신고해주셔서 감사합니다. 검토 후 조치하겠습니다.
            </p>
            <button
              onClick={() => {
                setShowReportSuccessModal(false);
                setShowReportModal(false);
              }}
              className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeItem={getActiveItem()}
        onItemClick={handleBottomNavClick}
      />
    </div>
  );
}
