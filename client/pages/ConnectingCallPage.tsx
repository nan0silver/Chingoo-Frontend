import { useEffect, useState, useCallback, useRef } from "react";
import { useMatchingStore } from "@/lib/matchingStore";
import { useCall } from "@/lib/useCall";
import { getWebSocketService } from "@/lib/websocket";
import { getCategoryDisplayName } from "@shared/api";
import { logger } from "@/lib/logger";

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
  const { queuePosition, status, matchingId, saveMatchingToStorage } =
    useMatchingStore();
  const { isInCall, isConnecting, error, callId, partner, handleCallStart } =
    useCall();
  const webSocketService = getWebSocketService();

  // 중복 알림 방지를 위한 ref
  const processedNotifications = useRef<Set<number>>(new Set());

  // 연결 타임아웃 제한 (30초)
  const CONNECTION_TIMEOUT = 30 * 1000; // 30초
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // 중복 알림 방지 - callId 기반 체크
      if (
        notification.callId &&
        processedNotifications.current.has(notification.callId)
      ) {
        if (import.meta.env.DEV) {
          logger.log(
            "⚠️ ConnectingCallPage: 이미 처리된 알림 - 무시",
            notification.callId,
          );
        }
        return;
      }

      // 이미 통화 중이거나 연결 중인지 확인
      if (isInCall || isConnecting) {
        if (import.meta.env.DEV) {
          logger.log("⚠️ ConnectingCallPage: 이미 통화 중 - 알림 무시");
        }
        return;
      }

      // 알림 처리 표시
      if (notification.callId) {
        processedNotifications.current.add(notification.callId);
      }

      if (import.meta.env.DEV) {
        logger.log("🔔 ConnectingCallPage에서 통화 시작 알림 수신");
      }

      // useCall의 handleCallStart 함수 호출
      if (import.meta.env.DEV) {
        logger.log("🎯 ConnectingCallPage에서 handleCallStart 호출");
      }
      handleCallStart(notification);
    },
    [handleCallStart, isInCall, isConnecting],
  );

  // 매칭 알림 핸들러 (useCallback으로 메모이제이션)
  const handleMatchingNotification = useCallback((notification: any) => {
    if (import.meta.env.DEV) {
      logger.log("🔔 ConnectingCallPage에서 매칭 알림 수신:", notification);
    }
  }, []);

  // WebSocket 알림 수신 (언마운트 시 콜백 제거로 누적 방지)
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.log("🔧 ConnectingCallPage - WebSocket 콜백 등록");
    }
    webSocketService.onCallStartNotificationCallback(
      handleCallStartNotification,
    );
    webSocketService.onMatchingNotificationCallback(handleMatchingNotification);

    return () => {
      webSocketService.removeCallStartNotificationCallback(
        handleCallStartNotification,
      );
      webSocketService.removeMatchingNotificationCallback(handleMatchingNotification);
      if (import.meta.env.DEV) {
        logger.log("🔧 ConnectingCallPage - WebSocket 콜백 정리");
      }
    };
  }, [
    webSocketService,
    handleCallStartNotification,
    handleMatchingNotification,
  ]);

  // 연결 타임아웃 감지 (30초) - 비용 방어
  useEffect(() => {
    if (isConnecting && !isInCall) {
      // 연결 중일 때 타임아웃 타이머 시작
      if (import.meta.env.DEV) {
        logger.log("⏰ 연결 타임아웃 타이머 시작 (30초)");
      }

      connectionTimeoutRef.current = setTimeout(() => {
        logger.warn("⚠️ 연결 타임아웃 (30초) - 자동 취소 (비용 방어)");
        alert("통화 연결 시간이 초과되었습니다. 다시 시도해주세요.");
        onCancel();
      }, CONNECTION_TIMEOUT);
    } else {
      // 연결이 완료되거나 취소되면 타이머 정리
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        if (import.meta.env.DEV) {
          logger.log("⏰ 연결 타임아웃 타이머 정리");
        }
      }
    }

    return () => {
      // 컴포넌트 언마운트 시 타이머 정리
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [isConnecting, isInCall, onCancel]);

  // 에러 발생 시 처리
  useEffect(() => {
    if (error) {
      logger.error("통화 연결 에러:", error);
      // 에러 발생 시 사용자에게 알림 (필요시 토스트 메시지 등으로 처리)
    }
  }, [error]);

  // 페이지 언로드 감지 및 새로고침 방지 (브라우저 닫기, 새로고침 등)
  useEffect(() => {
    // 매칭 대기 중일 때만 새로고침 방지
    if (status !== "waiting" || !matchingId) {
      return;
    }

    // 새로고침 키보드 단축키 막기 (F5, Ctrl+R, Ctrl+Shift+R 등)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 키
      if (e.key === "F5") {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⚠️ 통화 대기 중에는 새로고침할 수 없습니다. 취소 후 다시 시도해주세요.",
        );
        return false;
      }

      // Ctrl+R 또는 Ctrl+Shift+R (새로고침)
      if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⚠️ 통화 대기 중에는 새로고침할 수 없습니다. 취소 후 다시 시도해주세요.",
        );
        return false;
      }

      // Ctrl+Shift+R (강제 새로고침)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "r" || e.key === "R")
      ) {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⚠️ 통화 대기 중에는 새로고침할 수 없습니다. 취소 후 다시 시도해주세요.",
        );
        return false;
      }
    };

    // beforeunload 이벤트 - 페이지 나가기/새로고침 시 경고 및 매칭 정보 저장
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 매칭 대기 중일 때만 경고 메시지 표시 및 매칭 정보 저장
      e.preventDefault();
      // 최신 브라우저에서는 returnValue만 설정하면 됨
      e.returnValue =
        "통화 대기가 진행 중입니다. 페이지를 나가면 대기가 취소됩니다. 정말 나가시겠습니까?";

      // 매칭 정보를 localStorage에 저장 (API 호출 없음)
      // 새로고침 시 30초 이내 복원을 위해
      try {
        saveMatchingToStorage();
        if (import.meta.env.DEV) {
          logger.log("💾 beforeunload: 매칭 정보 저장 완료 (API 호출 없음)");
        }
      } catch (error) {
        logger.error("beforeunload: 매칭 정보 저장 실패:", error);
      }

      return e.returnValue;
    };

    // unload 이벤트 - 아무 작업도 하지 않음 (매칭 취소 API는 취소 버튼 클릭 시에만 호출)
    const handleUnload = () => {
      // 매칭 정보는 beforeunload에서 이미 저장되었으므로
      // 여기서는 아무 작업도 하지 않음 (API 호출 없음)
      if (import.meta.env.DEV) {
        logger.log(
          "⚠️ 페이지 언로드 감지 - 매칭 정보는 이미 저장됨 (API 호출 없음)",
        );
      }
    };

    // popstate 이벤트 - 브라우저 뒤로가기/앞으로가기 막기
    const handlePopState = (e: PopStateEvent) => {
      if (status === "waiting" && matchingId) {
        // 히스토리에 현재 상태를 다시 추가하여 뒤로가기 방지
        window.history.pushState(null, "", window.location.href);
        alert(
          "⚠️ 통화 대기 중에는 뒤로가기를 할 수 없습니다. 취소 후 다시 시도해주세요.",
        );
      }
    };

    // 히스토리 상태 추가 (뒤로가기 방지)
    window.history.pushState(null, "", window.location.href);

    // 이벤트 리스너 등록
    window.addEventListener("keydown", handleKeyDown, true); // capture phase에서 처리
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [status, matchingId, saveMatchingToStorage]);

  return (
    <div
      className="min-h-screen flex flex-col relative safe-area-page pt-6 font-noto"
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
