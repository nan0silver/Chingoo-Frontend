import { useEffect, useState, useCallback } from "react";
import { useMatchingStore } from "@/lib/matchingStore";
import { useCall } from "@/lib/useCall";
import { getWebSocketService } from "@/lib/websocket";

interface ConnectingCallPageProps {
  selectedCategory: string | null;
  onCancel: () => void;
  onConnected: () => void;
}

export default function ConnectingCallPage({
  selectedCategory,
  onCancel,
  onConnected,
}: ConnectingCallPageProps) {
  const [dots, setDots] = useState("");
  const { queuePosition, estimatedWaitTime } = useMatchingStore();
  const { isInCall, isConnecting, error, callId, partner, handleCallStart } =
    useCall();
  const webSocketService = getWebSocketService();

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 통화 연결 성공 시 자동으로 연결된 페이지로 이동
  useEffect(() => {
    if (isInCall && !isConnecting) {
      onConnected();
    }
  }, [isInCall, isConnecting, onConnected]);

  // 통화 시작 알림 핸들러 (useCallback으로 메모이제이션)
  const handleCallStartNotification = useCallback(
    (notification: any) => {
      if (import.meta.env.DEV) {
        console.log("🔔 ConnectingCallPage에서 통화 시작 알림 수신");
      }

      // useCall의 handleCallStart 함수 호출
      if (import.meta.env.DEV) {
        console.log("🎯 ConnectingCallPage에서 handleCallStart 호출");
      }
      handleCallStart(notification);
    },
    [handleCallStart],
  );

  // 매칭 알림 핸들러 (useCallback으로 메모이제이션)
  const handleMatchingNotification = useCallback((notification: any) => {
    if (import.meta.env.DEV) {
      console.log("🔔 ConnectingCallPage에서 매칭 알림 수신:", notification);
    }
  }, []);

  // WebSocket 알림 수신 추적
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🔧 ConnectingCallPage - WebSocket 콜백 등록");
    }
    webSocketService.onCallStartNotificationCallback(
      handleCallStartNotification,
    );
    webSocketService.onMatchingNotificationCallback(handleMatchingNotification);

    return () => {
      if (import.meta.env.DEV) {
        console.log("🔧 ConnectingCallPage - 컴포넌트 언마운트");
      }
      // 정리 함수는 필요시에만 구현
    };
  }, [
    webSocketService,
    handleCallStartNotification,
    handleMatchingNotification,
  ]);

  // 에러 발생 시 처리
  useEffect(() => {
    if (error) {
      console.error("통화 연결 에러:", error);
      // 에러 발생 시 사용자에게 알림 (필요시 토스트 메시지 등으로 처리)
    }
  }, [error]);

  const getCategoryDisplayName = (category: string | null) => {
    if (!category) return "알 수 없음";

    // 숫자 ID인 경우 카테고리 이름으로 변환
    const categoryId = parseInt(category);
    if (!isNaN(categoryId)) {
      const categoryMap: Record<number, string> = {
        1: "취미",
        2: "자녀",
        3: "요리",
        4: "추억",
        5: "음악",
        6: "여행",
      };
      return categoryMap[categoryId] || "알 수 없음";
    }

    // 문자열인 경우 기존 로직 사용
    const categoryMap: Record<string, string> = {
      hobby: "취미",
      children: "자녀",
      cooking: "요리",
      memories: "추억",
      music: "음악",
      travel: "여행",
    };
    return categoryMap[category] || category;
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background: `linear-gradient(0deg, rgba(120, 90, 0, 0.20) 0%, rgba(120, 90, 0, 0.20) 100%), 
                    radial-gradient(138.99% 139.71% at 10.56% -25.76%, rgba(235, 161, 0, 0.80) 0%, rgba(245, 69, 53, 0.80) 100%)`,
      }}
    >
      {/* Interest Tag */}
      <div className="flex justify-center mt-8">
        <div className="bg-white px-4 py-2 rounded">
          <span className="text-orange-500 font-crimson text-xl font-bold">
            관심사 : {getCategoryDisplayName(selectedCategory)}
          </span>
        </div>
      </div>

      {/* Call Status */}
      <div className="flex justify-center mt-16">
        <h1 className="text-white font-pretendard text-4xl font-medium">
          통화 연결 중
        </h1>
      </div>

      {/* Loading Spinner */}
      <div className="flex justify-center mt-20">
        <div className="relative">
          <svg
            width="64"
            height="64"
            viewBox="0 0 65 65"
            fill="none"
            className="animate-spin"
            style={{ transform: "rotate(-90deg)" }}
          >
            <mask id="path-1-inside-1_6652_403" fill="white">
              <path d="M32.0187 0.000213623C49.7021 0.000213623 64.0374 14.3355 64.0374 32.0189C64.0374 49.7023 49.7021 64.0376 32.0187 64.0376C14.3353 64.0376 0 49.7023 0 32.0189C0 14.3355 14.3353 0.000213623 32.0187 0.000213623Z" />
            </mask>
            <path
              d="M32.0187 0.000213623L32.0187 9.339C44.5445 9.339 54.6986 19.4931 54.6986 32.0189L64.0374 32.0189H73.3762C73.3762 9.1778 54.8598 -9.33857 32.0187 -9.33857V0.000213623ZM64.0374 32.0189L54.6986 32.0189C54.6986 44.5447 44.5445 54.6988 32.0187 54.6988V64.0376V73.3764C54.8598 73.3764 73.3762 54.86 73.3762 32.0189H64.0374ZM32.0187 64.0376V54.6988C19.4929 54.6988 9.33879 44.5447 9.33879 32.0189H0H-9.33879C-9.33879 54.86 9.17759 73.3764 32.0187 73.3764V64.0376ZM0 32.0189H9.33879C9.33879 19.4931 19.4929 9.339 32.0187 9.339L32.0187 0.000213623V-9.33857C9.17759 -9.33857 -9.33879 9.1778 -9.33879 32.0189H0Z"
              fill="url(#gradient)"
              mask="url(#path-1-inside-1_6652_403)"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="100%" stopColor="rgba(255,255,255,1)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Waiting Message */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-white font-crimson text-2xl md:text-3xl font-bold leading-9">
            대화 상대를 찾을 때까지
            <br />
            잠시만 기다려주세요{dots}
          </p>

          {/* 실시간 대기 정보 */}
          {(queuePosition !== undefined || estimatedWaitTime !== undefined) && (
            <div className="mt-8 space-y-2">
              {queuePosition !== undefined && (
                <p className="text-white font-crimson text-lg">
                  대기 순서: {queuePosition}번째
                </p>
              )}
              {estimatedWaitTime !== undefined && (
                <p className="text-white font-crimson text-lg">
                  예상 대기 시간: {estimatedWaitTime}분
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Button */}
      <div className="px-5 pb-8 md:pb-12">
        <div className="h-20 md:h-24 relative">
          <button
            onClick={onCancel}
            className="w-full h-14 md:h-16 bg-white rounded-lg font-crimson text-xl md:text-2xl font-bold text-orange-500 hover:bg-gray-50 transition-colors"
          >
            취소하기
          </button>
        </div>
      </div>
    </div>
  );
}
