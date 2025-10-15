import { useEffect, useState } from "react";
import { useCall } from "@/lib/useCall";
import { getWebSocketService } from "@/lib/websocket";

interface CallConnectedPageProps {
  selectedCategory: string | null;
  onEndCall: () => void;
}

export default function CallConnectedPage({
  selectedCategory,
  onEndCall,
}: CallConnectedPageProps) {
  const [audioWaveAnimation, setAudioWaveAnimation] = useState(0);
  const {
    partner,
    agoraState,
    callDuration,
    isInCall,
    handleEndCall,
    toggleMute,
    toggleSpeaker,
    setError,
  } = useCall();

  // 디버깅: partner 정보 확인 (개발 환경만)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🔍 CallConnectedPage - partner 정보:", partner);

      // WebSocket 구독 상태 확인
      const webSocketService = getWebSocketService();
      console.log(
        "🔍 CallConnectedPage - WebSocket 구독 상태:",
        webSocketService.getSubscriptionStatus(),
      );
    }
  }, [partner]);

  // 통화 종료 감지 - isInCall이 false가 되면 평가 화면으로 이동
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🔍 CallConnectedPage - isInCall 상태:", isInCall);
    }

    if (!isInCall && partner) {
      if (import.meta.env.DEV) {
        console.log("📞 통화가 종료됨 - 평가 화면으로 이동");
      }
      // 통화가 종료되면 평가 화면으로 이동 (partner 정보가 있을 때만)
      setTimeout(() => {
        onEndCall();
      }, 100); // 약간의 지연을 두어 상태 안정화
    }
  }, [isInCall, partner, onEndCall]);

  // 페이지 언로드 감지 (브라우저 닫기, 새로고침 등) - 비용 방어
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInCall) {
        // 통화 중일 때만 경고 메시지 표시
        e.preventDefault();
        e.returnValue = "통화가 진행 중입니다. 정말 페이지를 나가시겠습니까?";
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      if (isInCall) {
        // 페이지 언로드 시 통화 종료 (비동기 처리 불가, navigator.sendBeacon 사용)
        if (import.meta.env.DEV) {
          console.log(
            "⚠️ 페이지 언로드 감지 - 통화 자동 종료 시도 (비용 방어)",
          );
        }

        // 동기적으로 통화 종료 처리 (navigator.sendBeacon을 사용한 백엔드 알림)
        handleEndCall().catch((error) => {
          console.error("페이지 언로드 시 통화 종료 실패:", error);
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [isInCall, handleEndCall]);

  // Format seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // 통화 종료 핸들러
  const handleEndCallClick = async () => {
    if (import.meta.env.DEV) {
      console.log("🔴 통화 종료 버튼 클릭됨 - handleEndCallClick 시작");
    }
    try {
      if (import.meta.env.DEV) {
        console.log("🔴 handleEndCall 호출 전");
      }
      await handleEndCall();
      if (import.meta.env.DEV) {
        console.log("🔴 handleEndCall 호출 후");
      }
      onEndCall();
    } catch (error) {
      console.error("통화 종료 실패:", error);
      // 이미 종료된 통화에 대한 에러는 무시하고 평가 화면으로 이동
      if (
        error instanceof Error &&
        error.message.includes("이미 종료된 통화")
      ) {
        if (import.meta.env.DEV) {
          console.log("통화가 이미 종료됨 - 평가 화면으로 이동");
        }
        onEndCall();
      } else {
        setError("통화 종료에 실패했습니다.");
      }
    }
  };

  // Animate audio wave dots
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioWaveAnimation((prev) => (prev + 1) % 5);
    }, 200);

    return () => clearInterval(interval);
  }, []);

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

      {/* Call Status Container */}
      <div className="flex flex-col items-center justify-center mt-8 gap-1">
        <div className="flex items-center gap-1">
          <span className="text-white font-crimson text-3xl font-bold">
            {partner?.nickname || "상대방"}
          </span>
          <span className="text-white font-pretendard text-3xl font-normal">
            님과
          </span>
        </div>
        <span className="text-white font-pretendard text-4xl font-normal">
          통화중
        </span>
      </div>

      {/* Profile Image */}
      <div className="flex justify-center mt-8">
        <div className="w-32 h-32 rounded-3xl bg-orange-100 flex items-center justify-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path
              d="M40.294 41.162C46.589 41.162 51.696 36.055 51.696 29.76C51.696 23.465 46.589 18.358 40.294 18.358C34 18.358 28.893 23.465 28.893 29.76C28.893 36.055 34 41.162 40.294 41.162Z"
              fill="#EE9049"
            />
            <path
              d="M40.2927 44.504C25.6233 44.504 19.9185 54.507 19.9185 59.1582C19.9185 63.8094 32.0641 65.0489 40.2927 65.0489C48.5213 65.0489 60.6669 63.8094 60.6669 59.1582C60.6669 54.507 54.9621 44.504 40.2927 44.504Z"
              fill="#EE9049"
            />
          </svg>
        </div>
      </div>

      {/* Call Duration */}
      <div className="flex justify-center mt-8">
        <span className="text-white font-crimson text-2xl font-normal">
          {formatDuration(callDuration)}
        </span>
      </div>

      {/* Audio Wave Animation */}
      <div className="flex justify-center mt-8">
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`w-2 h-2 bg-white rounded-full transition-opacity duration-200 ${
                audioWaveAnimation === index ? "opacity-100" : "opacity-40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Controls Container */}
      <div className="flex-1 flex items-end justify-center pb-16">
        <div className="flex items-center justify-between w-80">
          {/* Speaker Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={toggleSpeaker}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                agoraState.isSpeakerOn
                  ? "bg-white bg-opacity-20"
                  : "bg-red-500 bg-opacity-50"
              }`}
            >
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <path
                  d="M23.1549 16.3334C22.4369 16.3334 21.8549 15.7513 21.8549 15.0334C21.8549 14.3154 22.4369 13.7334 23.1549 13.7334H26.7C27.418 13.7334 28 14.3154 28 15.0334C28 15.7513 27.418 16.3334 26.7 16.3334H23.1549ZM24.5798 26.9517C24.1486 27.5287 23.3292 27.6426 22.757 27.205L19.8968 25.0174C19.3336 24.5866 19.2219 23.7829 19.6464 23.2149C20.0776 22.638 20.8968 22.5242 21.4689 22.9617L24.3293 25.1491C24.8925 25.5798 25.0042 26.3836 24.5798 26.9517ZM21.4037 7.03847C20.8315 7.47612 20.0121 7.36225 19.5809 6.78516C19.1564 6.21715 19.2681 5.41337 19.8313 4.9826L22.6915 2.79506C23.2637 2.35741 24.0832 2.47128 24.5144 3.04838C24.9388 3.61639 24.8271 4.42017 24.2639 4.85093L21.4037 7.03847ZM3 19.3667C1.89543 19.3667 1 18.4713 1 17.3667V12.7C1 11.5955 1.89543 10.7 3 10.7H7.3087L12.8842 5.01477C13.5113 4.37534 14.5982 4.81934 14.5982 5.71495V24.3518C14.5982 25.2474 13.5113 25.6914 12.8842 25.052L7.3087 19.3667H3Z"
                  fill="white"
                />
              </svg>
            </button>
            <span className="text-white font-crimson text-lg font-bold">
              스피커폰
            </span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleEndCallClick}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center"
            >
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.8823 14.9998L24.2533 7.62879C24.7727 7.10936 24.7727 6.26593 24.2533 5.7465C23.7339 5.22708 22.8904 5.22708 22.371 5.7465L15 13.1175L7.629 5.7465C7.10958 5.22708 6.26615 5.22708 5.74672 5.7465C5.22729 6.26593 5.22729 7.10936 5.74672 7.62879L13.1177 14.9998L5.74672 22.3708C5.22729 22.8902 5.22729 23.7336 5.74672 24.2531C6.26615 24.7725 7.10958 24.7725 7.629 24.2531L15 16.8821L22.371 24.2531C22.8904 24.7725 23.7339 24.7725 24.2533 24.2531C24.7727 23.7336 24.7727 22.8902 24.2533 22.3708L16.8823 14.9998Z"
                  fill="white"
                />
              </svg>
            </button>
            <span className="text-white font-crimson text-lg font-bold">
              통화 종료
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
