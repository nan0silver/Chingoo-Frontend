import { useState, useEffect } from "react";
import { useCall } from "@/lib/useCall";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken } from "@/lib/auth";
import { UserPlus } from "lucide-react";

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
  const { partner, clearPartner, callId } = useCall();
  const matchingApiService = getMatchingApiService();

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

      if (error?.message) {
        const message = error.message.toLowerCase();

        // 이미 요청을 보낸 경우 (가장 구체적인 메시지부터 체크)
        if (
          message.includes("이미 친구 요청을 보냈습니다") ||
          message.includes("이미 요청") ||
          message.includes("already requested") ||
          message.includes("pending")
        ) {
          errorMessage = "이미 친구 요청을 보냈습니다.";
        }
        // 상대방이 이미 요청을 보낸 경우
        else if (
          message.includes("상대방") ||
          message.includes("receiver") ||
          message.includes("받은 요청")
        ) {
          errorMessage =
            "상대방이 이미 친구 요청을 보냈습니다. 받은 친구 요청에서 확인해주세요.";
        }
        // 동시 요청 (409 Conflict)
        else if (message.includes("409") || message.includes("conflict")) {
          errorMessage =
            "상대방이 동시에 친구 요청을 보냈습니다. 받은 친구 요청에서 확인해주세요.";
        }
        // 이미 친구인 경우 (더 일반적인 메시지는 나중에 체크)
        else if (
          message.includes("이미 친구") ||
          message.includes("already friend") ||
          message.includes("already exists")
        ) {
          errorMessage = "이미 친구입니다.";
        }
        // 기타 에러는 서버 메시지 사용
        else {
          errorMessage = error.message || errorMessage;
        }
      }

      setFriendRequestStatus("error");
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

      // 평가 제출 후 partner 정보 삭제
      clearPartner();
      if (import.meta.env.DEV) {
        console.log("✅ 평가 제출 후 partner 정보 삭제 완료");
      }

      // 2초 후 홈페이지로 이동
      setTimeout(() => {
        setShowSuccessModal(false);
        onGoHome();
      }, 2000);
    } catch (error) {
      console.error("❌ 평가 제출 실패:", error);
      alert("평가 제출에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative safe-area-page font-noto">
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
            <p className="text-gray-600">
              {selectedRating === "good" ? "좋았어요" : "별로였어요"}로
              평가되었습니다.
            </p>
          </div>
        </div>
      )}

      {/* Friend Request Modal */}
      {showFriendRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center">
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
              className={`w-full h-12 rounded-lg font-crimson text-lg font-semibold ${
                friendRequestStatus === "success"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } transition-colors`}
            >
              확인
            </button>
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
      {partner?.nickname && (
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

      {/* Buttons Container */}
      <div className="flex-1 flex items-end pb-8">
        <div className="w-full px-5">
          <div className="flex gap-2">
            {/* Call Again Button */}
            <button
              onClick={() => {
                // 다시 통화하기 전에 partner 정보 삭제
                clearPartner();
                if (import.meta.env.DEV) {
                  console.log("✅ 다시 통화하기 - partner 정보 삭제 완료");
                }
                onCallAgain();
              }}
              className="flex-1 h-14 border border-orange-500 rounded-lg flex items-center justify-center bg-white"
            >
              <span className="text-orange-500 font-crimson text-xl font-bold">
                다시 통화하기
              </span>
            </button>

            {/* Select Interests Button */}
            <button
              onClick={() => {
                // 관심사 선택 전에 partner 정보 삭제
                clearPartner();
                if (import.meta.env.DEV) {
                  console.log("✅ 관심사 선택 - partner 정보 삭제 완료");
                }
                onSelectInterests();
              }}
              className="flex-1 h-14 bg-orange-500 rounded-lg flex items-center justify-center"
            >
              <span className="text-white font-crimson text-xl font-bold">
                관심사 선택
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
