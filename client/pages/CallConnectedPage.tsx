import { useEffect, useState } from "react";
import { useCall } from "@/lib/useCall";
import { getWebSocketService } from "@/lib/websocket";
import { NetworkQuality, getAgoraService } from "@/lib/agoraService";
import { getCategoryDisplayName, ReportUserRequest } from "@shared/api";
import { getMatchingApiService } from "@/lib/matchingApi";
import { getStoredToken } from "@/lib/auth";
import ReportUserModal from "@/components/ReportUserModal";
import { getTTSService } from "@/lib/ttsService";
import { useCallStore } from "@/lib/callStore";

interface CallConnectedPageProps {
  selectedCategory: string | null;
  onEndCall: () => void;
}

export default function CallConnectedPage({
  selectedCategory: propSelectedCategory,
  onEndCall,
}: CallConnectedPageProps) {
  const [audioWaveAnimation, setAudioWaveAnimation] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportSuccessModal, setShowReportSuccessModal] = useState(false);
  const [showReportErrorModal, setShowReportErrorModal] = useState(false);
  const [reportErrorMessage, setReportErrorMessage] = useState<string>("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  // 복원된 카테고리 정보 사용 (props가 없으면 localStorage에서 복원)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    propSelectedCategory,
  );
  const {
    partner,
    callId,
    agoraState,
    callDuration,
    isInCall,
    handleEndCall,
    toggleMute,
    toggleSpeaker,
    setError,
    error,
  } = useCall();
  const matchingApiService = getMatchingApiService();

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

  // 컴포넌트 마운트 시 localStorage에서 카테고리 정보 복원
  useEffect(() => {
    if (!selectedCategory && isInCall) {
      import("@/lib/callStore").then(({ useCallStore }) => {
        const storedInfo = useCallStore.getState().restoreCallFromStorage();
        if (storedInfo?.categoryName) {
          setSelectedCategory(storedInfo.categoryName);
          if (import.meta.env.DEV) {
            console.log("💾 카테고리 정보 복원:", storedInfo.categoryName);
          }
        }
      });
    }
  }, [isInCall, selectedCategory]);

  // 통화 중일 때 카테고리 정보를 localStorage에 저장
  useEffect(() => {
    if (isInCall && selectedCategory) {
      import("@/lib/callStore").then(({ useCallStore }) => {
        useCallStore.getState().saveCallToStorage(selectedCategory);
        if (import.meta.env.DEV) {
          console.log("💾 카테고리 정보 저장:", selectedCategory);
        }
      });
    }
  }, [isInCall, selectedCategory]);

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

  // 페이지 언로드 감지 및 새로고침 방지 (브라우저 닫기, 새로고침 등)
  useEffect(() => {
    if (!isInCall) {
      return;
    }

    // 새로고침 키보드 단축키 막기 (F5, Ctrl+R, Ctrl+Shift+R 등)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 키
      if (e.key === "F5") {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⚠️ 통화 중에는 새로고침할 수 없습니다. 통화를 종료한 후 다시 시도해주세요.",
        );
        return false;
      }

      // Ctrl+R 또는 Ctrl+Shift+R (새로고침)
      if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⚠️ 통화 중에는 새로고침할 수 없습니다. 통화를 종료한 후 다시 시도해주세요.",
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
          "⚠️ 통화 중에는 새로고침할 수 없습니다. 통화를 종료한 후 다시 시도해주세요.",
        );
        return false;
      }
    };

    // beforeunload 이벤트 - 페이지 나가기/새로고침 시 경고 및 통화 정보 저장
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 통화 중일 때만 경고 메시지 표시 및 통화 정보 저장
      e.preventDefault();
      // 최신 브라우저에서는 returnValue만 설정하면 됨
      e.returnValue =
        "통화가 진행 중입니다. 페이지를 나가면 통화가 종료됩니다. 정말 나가시겠습니까?";

      // 통화 정보를 localStorage에 저장 (API 호출 없음)
      // 새로고침 시 30초 이내 복원을 위해
      try {
        useCallStore.getState().saveCallToStorage(selectedCategory);
        if (import.meta.env.DEV) {
          console.log("💾 beforeunload: 통화 정보 저장 완료 (API 호출 없음)");
        }
      } catch (error) {
        console.error("beforeunload: 통화 정보 저장 실패:", error);
      }

      return e.returnValue;
    };

    // unload 이벤트 - 아무 작업도 하지 않음 (통화 종료 API는 종료 버튼 클릭 시에만 호출)
    const handleUnload = () => {
      // 통화 정보는 beforeunload에서 이미 저장되었으므로
      // 여기서는 아무 작업도 하지 않음 (API 호출 없음)
      if (import.meta.env.DEV) {
        console.log(
          "⚠️ 페이지 언로드 감지 - 통화 정보는 이미 저장됨 (API 호출 없음)",
        );
      }
    };

    // popstate 이벤트 - 브라우저 뒤로가기/앞으로가기 막기
    const handlePopState = (e: PopStateEvent) => {
      if (isInCall) {
        // 히스토리에 현재 상태를 다시 추가하여 뒤로가기 방지
        window.history.pushState(null, "", window.location.href);
        alert(
          "⚠️ 통화 중에는 뒤로가기를 할 수 없습니다. 통화를 종료한 후 다시 시도해주세요.",
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
  }, [isInCall, handleEndCall, callId, selectedCategory]);

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

  // 통화 프롬프트 가져오기 및 TTS 읽기 (통화 맨 처음에만)
  useEffect(() => {
    const fetchPromptAndSpeak = async () => {
      if (!callId || !isInCall) {
        return;
      }

      // 이 callId에 대해 TTS가 이미 재생되었는지 확인
      const ttsPlayedKey = `tts_played_${callId}`;
      const ttsPlayed = localStorage.getItem(ttsPlayedKey);
      
      if (ttsPlayed === "true") {
        // 이미 재생된 경우 프롬프트만 가져오고 TTS는 재생하지 않음
        if (import.meta.env.DEV) {
          console.log("🔊 이 통화의 TTS는 이미 재생되었습니다 - TTS 건너뜀");
        }
        
        try {
          setIsLoadingPrompt(true);
          const token = getStoredToken();
          if (!token) {
            console.warn("인증 토큰이 없어 프롬프트를 가져올 수 없습니다.");
            return;
          }

          matchingApiService.setToken(token);
          const promptData = await matchingApiService.getCallPrompt(callId);
          const questionText = promptData.question;
          setPrompt(questionText);
        } catch (error) {
          console.error("프롬프트 가져오기 실패:", error);
        } finally {
          setIsLoadingPrompt(false);
        }
        return;
      }

      try {
        setIsLoadingPrompt(true);
        const token = getStoredToken();
        if (!token) {
          console.warn("인증 토큰이 없어 프롬프트를 가져올 수 없습니다.");
          return;
        }

        matchingApiService.setToken(token);
        const promptData = await matchingApiService.getCallPrompt(callId);
        const questionText = promptData.question;
        setPrompt(questionText);

        // 프롬프트를 TTS로 읽기 (통화 맨 처음에만)
        const ttsService = getTTSService();
        if (ttsService.getSupported() && questionText) {
          // 약간의 지연 후 TTS 시작 (통화 연결이 안정화된 후)
          setTimeout(() => {
            ttsService.speak(questionText, {
              lang: "ko-KR",
              voice: "Yuna", // Yuna 음성 사용
              rate: 1.0,
              pitch: 0.8,
              volume: 1.0,
              onEnd: () => {
                if (import.meta.env.DEV) {
                  console.log("🔊 프롬프트 TTS 읽기 완료");
                }
                // TTS 재생 완료 후 localStorage에 저장
                localStorage.setItem(ttsPlayedKey, "true");
              },
              onError: (error) => {
                console.error("TTS 읽기 오류:", error);
                // TTS 실패는 치명적이지 않으므로 에러를 표시하지 않음
              },
            });
          }, 1000); // 1초 후 TTS 시작
        }
      } catch (error) {
        console.error("프롬프트 가져오기 실패:", error);
        // 프롬프트 가져오기 실패는 치명적이지 않으므로 에러를 표시하지 않음
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    fetchPromptAndSpeak();
  }, [callId, isInCall, matchingApiService]);

  // 통화 종료 시 TTS 중지 및 재생 플래그 삭제
  useEffect(() => {
    if (!isInCall && callId) {
      const ttsService = getTTSService();
      ttsService.stop();
      
      // 통화 종료 시 해당 callId의 TTS 재생 플래그 삭제
      const ttsPlayedKey = `tts_played_${callId}`;
      localStorage.removeItem(ttsPlayedKey);
      
      if (import.meta.env.DEV) {
        console.log("🔊 통화 종료 - TTS 재생 플래그 삭제");
      }
    }
  }, [isInCall, callId]);

  // 네트워크 품질을 아이콘과 색상으로 변환
  const getNetworkQualityDisplay = (quality: NetworkQuality) => {
    if (quality === 0) {
      return { color: "text-gray-400", bars: 0, label: "측정중" };
    } else if (quality === 1 || quality === 2) {
      return { color: "text-green-400", bars: 3, label: "좋음" };
    } else if (quality === 3) {
      return { color: "text-yellow-400", bars: 2, label: "보통" };
    } else if (quality === 4) {
      return { color: "text-orange-400", bars: 1, label: "나쁨" };
    } else {
      return { color: "text-red-400", bars: 1, label: "매우나쁨" };
    }
  };

  // 현재 네트워크 품질 (다운링크가 더 중요하므로 다운링크 기준)
  const networkQuality = getNetworkQualityDisplay(
    agoraState.networkQuality?.downlinkNetworkQuality || 0,
  );

  // 사용자 신고 핸들러
  const handleReportUser = async (request: ReportUserRequest) => {
    if (!partner?.id) {
      setReportErrorMessage("상대방 정보를 찾을 수 없습니다.");
      setShowReportErrorModal(true);
      return;
    }

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      }

      matchingApiService.setToken(token);

      // call_id 추가 (통화 중이므로 callId가 있으면 포함)
      const reportRequest: ReportUserRequest = {
        ...request,
        call_id: callId ? parseInt(callId) : undefined,
      };

      await matchingApiService.reportUser(partner.id, reportRequest);

      // 신고한 사용자 ID를 localStorage에 저장
      try {
        const stored = localStorage.getItem("reportedUserIds");
        const currentIds = stored
          ? new Set<string>(JSON.parse(stored))
          : new Set<string>();
        currentIds.add(partner.id);
        localStorage.setItem(
          "reportedUserIds",
          JSON.stringify(Array.from(currentIds)),
        );
      } catch (error) {
        console.error("신고한 사용자 목록 저장 실패:", error);
      }

      setShowReportSuccessModal(true);
    } catch (error: any) {
      console.error("사용자 신고 실패:", error);

      let errorMessage = "신고에 실패했습니다. 다시 시도해주세요.";

      if (error?.message) {
        const message = error.message.toLowerCase();

        // 중복 신고 에러 처리
        if (
          message.includes("이미 해당 사용자를 신고했습니다") ||
          message.includes("이미 신고") ||
          message.includes("already reported") ||
          message.includes("duplicate") ||
          message.includes("중복")
        ) {
          errorMessage = "이미 해당 사용자를 신고했습니다.";
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      setReportErrorMessage(errorMessage);
      setShowReportErrorModal(true);
    }
  };

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

      {/* Network Quality Indicator */}
      <div className="absolute top-20 right-8">
        <div className="flex items-center gap-2 bg-black bg-opacity-30 px-3 py-2 rounded-full">
          {/* Signal Bars */}
          <div className="flex items-end gap-0.5 h-4">
            <div
              className={`w-1 h-2 rounded-sm ${networkQuality.bars >= 1 ? networkQuality.color : "bg-gray-600"}`}
            />
            <div
              className={`w-1 h-3 rounded-sm ${networkQuality.bars >= 2 ? networkQuality.color : "bg-gray-600"}`}
            />
            <div
              className={`w-1 h-4 rounded-sm ${networkQuality.bars >= 3 ? networkQuality.color : "bg-gray-600"}`}
            />
          </div>
          {/* Quality Label (나쁠 때만 표시) */}
          {(agoraState.networkQuality?.downlinkNetworkQuality || 0) >= 4 && (
            <span className={`text-xs font-pretendard ${networkQuality.color}`}>
              {networkQuality.label}
            </span>
          )}
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

      {/* Prompt Display */}
      {prompt && (
        <div className="flex justify-center mt-6 px-8">
          <div className="bg-white bg-opacity-90 px-6 py-4 rounded-2xl max-w-md shadow-lg">
            <p className="text-gray-800 font-pretendard text-lg text-center leading-relaxed">
              {prompt}
            </p>
          </div>
        </div>
      )}
      {isLoadingPrompt && (
        <div className="flex justify-center mt-6 px-8">
          <div className="bg-white bg-opacity-90 px-6 py-4 rounded-2xl max-w-md shadow-lg">
            <p className="text-gray-500 font-pretendard text-lg text-center">
              프롬프트를 불러오는 중...
            </p>
          </div>
        </div>
      )}

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

      {/* Error Message Display */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
            <p className="text-center font-pretendard">{error}</p>
          </div>
        </div>
      )}

      {/* Controls Container */}
      <div className="flex-1 flex items-end justify-center pb-16">
        <div className="flex items-center justify-between w-80">
          {/* Speaker Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={toggleSpeaker}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                agoraState.isSpeakerOn
                  ? "bg-red-500 bg-opacity-50"
                  : "bg-white bg-opacity-20"
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

          {/* Report Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setShowReportModal(true)}
              className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-colors"
            >
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <path
                  d="M15 2.5C8.1 2.5 2.5 8.1 2.5 15C2.5 21.9 8.1 27.5 15 27.5C21.9 27.5 27.5 21.9 27.5 15C27.5 8.1 21.9 2.5 15 2.5ZM15 22.5C14.3 22.5 13.75 21.95 13.75 21.25C13.75 20.55 14.3 20 15 20C15.7 20 16.25 20.55 16.25 21.25C16.25 21.95 15.7 22.5 15 22.5ZM16.25 16.25H13.75V8.75H16.25V16.25Z"
                  fill="white"
                />
              </svg>
            </button>
            <span className="text-white font-crimson text-lg font-bold">
              신고하기
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

      {/* Report Error Modal */}
      {showReportErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center">
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">신고 실패</h3>
            <p className="text-gray-600 mb-6">{reportErrorMessage}</p>
            <button
              onClick={() => {
                setShowReportErrorModal(false);
                setShowReportModal(false);
              }}
              className="w-full h-12 rounded-lg font-crimson text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
