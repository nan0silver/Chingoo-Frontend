import { useEffect, useCallback } from "react";
import { useCallStore } from "./callStore";
import { getAgoraService, AgoraCallbacks } from "./agoraService";
import { getWebSocketService } from "./websocket";
import { getMatchingApiService } from "./matchingApi";
import { CallStartNotification } from "@shared/api";

/**
 * 통화 관리 훅
 */
export const useCall = () => {
  const {
    callId,
    matchingId,
    partner,
    agoraChannelInfo,
    isInCall,
    isConnecting,
    callStartTime,
    agoraState,
    error,
    startCall,
    endCall,
    updateConnectingState,
    updateAgoraState,
    setError,
    clearPartner,
  } = useCallStore();

  // 디버깅: partner 정보 변경 시에만 로그 출력
  useEffect(() => {
    console.log("🎣 useCall 훅 - partner 정보:", partner);
  }, [partner]);

  const agoraService = getAgoraService();
  const webSocketService = getWebSocketService();
  const matchingApiService = getMatchingApiService();

  /**
   * 통화 시작 (WebSocket 알림 수신 시)
   */
  const handleCallStart = useCallback(
    async (notification: CallStartNotification) => {
      try {
        console.log("🎯 통화 시작 알림 수신:", notification);
        console.log("📋 알림 상세 정보:", {
          type: notification.type,
          callId: notification.callId,
          matchingId: notification.matchingId,
          partnerId: notification.partnerId,
          partnerNickname: notification.partnerNickname,
          channelName: notification.channelName,
          agoraUid: notification.agoraUid,
          timestamp: notification.timestamp,
        });

        // 통화 상태 업데이트
        console.log(
          "🔄 useCall에서 startCall 호출 전 - notification:",
          notification,
        );
        startCall(notification);
        console.log("🔄 useCall에서 startCall 호출 후");
        updateConnectingState(true);

        // Agora 콜백 설정
        const agoraCallbacks: AgoraCallbacks = {
          onConnectionStateChange: (state) => {
            console.log("Agora 연결 상태 변경:", state);
            updateAgoraState(agoraService.getCallState());
          },
          onUserJoined: (userId) => {
            console.log("사용자 입장:", userId);
          },
          onUserLeft: (userId) => {
            console.log("사용자 퇴장:", userId);

            // 현재 상태를 직접 가져와서 클로저 문제 해결
            const currentState = useCallStore.getState();
            console.log("🔍 현재 partner 정보:", currentState.partner);
            console.log("🔍 퇴장한 userId:", userId);

            // 상대방이 퇴장한 경우 통화 종료 처리
            if (
              currentState.partner?.id &&
              String(userId) === String(currentState.partner.id)
            ) {
              console.log("📞 상대방이 퇴장했습니다 - 통화 종료 처리 시작");

              // 상대방 퇴장 시에도 WebSocket 알림 전송 (상대방이 예상치 못하게 퇴장한 경우)
              if (currentState.callId && currentState.partner.id) {
                if (import.meta.env.DEV) {
                  console.log("📡 상대방 퇴장으로 인한 WebSocket 알림 전송:", {
                    callId: currentState.callId,
                    partnerId: currentState.partner.id,
                  });
                }
                try {
                  webSocketService.sendCallEndNotification(
                    currentState.callId,
                    currentState.partner.id,
                  );
                  console.log("✅ 상대방 퇴장 WebSocket 알림 전송 성공");
                } catch (wsError) {
                  console.error(
                    "❌ 상대방 퇴장 WebSocket 알림 전송 실패:",
                    wsError,
                  );
                }
              }

              // Agora 채널에서 퇴장
              agoraService.leaveChannel().catch((error) => {
                console.error("Agora 채널 퇴장 실패:", error);
              });

              // 통화 상태 초기화
              endCall();
              console.log("📞 상대방 퇴장으로 인한 통화 종료 처리 완료");
            } else {
              console.log("⚠️ partner 정보가 없거나 다른 사용자 퇴장 - 무시");
            }
          },
          onAudioTrackSubscribed: (userId, audioTrack) => {
            console.log("오디오 트랙 구독:", userId);
            updateAgoraState(agoraService.getCallState());
          },
          onAudioTrackUnsubscribed: (userId) => {
            console.log("오디오 트랙 구독 해제:", userId);
            updateAgoraState(agoraService.getCallState());
          },
          onCallStarted: () => {
            console.log("Agora 통화 시작");
            updateConnectingState(false);
            updateAgoraState(agoraService.getCallState());
          },
          onCallEnded: () => {
            console.log("Agora 통화 종료");
            // onCallEnded는 Agora SDK에서 호출되는 콜백이므로
            // 여기서는 단순히 상태만 초기화하고 WebSocket 알림은 handleEndCall에서 처리
            endCall();
          },
          onError: (error) => {
            console.error("Agora 에러:", error);
            setError(error.message);
          },
        };

        agoraService.setCallbacks(agoraCallbacks);

        // 백엔드 데이터를 Agora 형식으로 변환
        const agoraChannelInfo = {
          appId: import.meta.env.VITE_AGORA_APP_ID || "your-agora-app-id",
          channelName: notification.channelName,
          token: notification.rtcToken,
          uid: String(notification.agoraUid),
        };

        console.log("🔄 변환된 Agora 채널 정보:", agoraChannelInfo);

        // Agora 채널에 입장
        console.log("🎯 Agora 채널 입장 시작:", agoraChannelInfo);
        try {
          await agoraService.joinChannel(agoraChannelInfo);
          console.log("✅ Agora 채널 입장 완료");
        } catch (agoraError) {
          console.error("❌ Agora 채널 입장 실패:", agoraError);
          throw agoraError;
        }
      } catch (error) {
        console.error("통화 시작 실패:", error);
        setError(
          error instanceof Error ? error.message : "통화 시작에 실패했습니다.",
        );
        updateConnectingState(false);
      }
    },
    [
      agoraService,
      startCall,
      updateConnectingState,
      updateAgoraState,
      endCall,
      setError,
    ],
  );

  /**
   * 통화 종료
   */
  const handleEndCall = useCallback(async () => {
    try {
      console.log("통화 종료 요청");

      if (!callId) {
        console.log("❌ callId가 없어 통화 종료 불가");
        return;
      }

      // partner 정보를 미리 저장 (WebSocket 알림 전송용)
      const currentPartner = partner;

      // 1. Agora 연결 해제
      console.log("📞 1. Agora 채널에서 퇴장 시작");
      await agoraService.leaveChannel();
      console.log("✅ 1. Agora 채널 퇴장 완료");

      // 2. 채널 나가기 API 호출
      console.log("📡 2. 백엔드 채널 나가기 API 호출:", callId);
      try {
        // 토큰 설정 (갱신된 토큰 포함)
        const { getStoredToken } = await import("./auth");
        const token = getStoredToken();
        if (token) {
          matchingApiService.setToken(token);
          console.log("🔑 matchingApiService에 토큰 설정 완료");
        } else {
          console.warn("⚠️ 토큰이 없어 API 호출을 건너뜁니다");
        }

        await matchingApiService.leaveChannel(callId);
        console.log("✅ 2. 채널 나가기 API 호출 성공");
      } catch (apiError) {
        console.error("❌ 2. 채널 나가기 API 호출 실패:", apiError);
        // API 호출 실패해도 통화 종료는 계속 진행
      }

      // 3. 통화 종료 API 호출
      console.log("📡 3. 백엔드 통화 종료 API 호출:", callId);
      try {
        // 토큰 설정 (갱신된 토큰 포함)
        const { getStoredToken } = await import("./auth");
        const token = getStoredToken();
        if (token) {
          matchingApiService.setToken(token);
          console.log("🔑 matchingApiService에 토큰 설정 완료");
        } else {
          console.warn("⚠️ 토큰이 없어 API 호출을 건너뜁니다");
        }

        await matchingApiService.endCall(callId);
        console.log("✅ 3. 통화 종료 API 호출 성공");
      } catch (apiError) {
        // 409 Conflict (이미 종료된 통화)는 정상적인 상황으로 처리
        if (
          apiError instanceof Error &&
          apiError.message.includes("이미 종료된 통화")
        ) {
          console.log("ℹ️ 통화가 이미 종료됨 - 정상적인 상황");
        } else {
          console.error("❌ 3. 통화 종료 API 호출 실패:", apiError);
        }
        // API 호출 실패해도 통화 상태 초기화는 계속 진행
      }

      // 4. 상대방에게 통화 종료 WebSocket 알림 전송 (저장된 partner 정보 사용)
      if (currentPartner?.id) {
        if (import.meta.env.DEV) {
          console.log("📡 상대방에게 통화 종료 알림 전송:", {
            callId,
            partnerId: currentPartner.id,
          });
        }

        // WebSocket 연결 상태 확인
        const wsConnectionState = webSocketService.getConnectionState();
        if (import.meta.env.DEV) {
          console.log("🔍 WebSocket 연결 상태:", wsConnectionState);
        }

        if (!wsConnectionState.isConnected) {
          console.error("❌ WebSocket이 연결되지 않음 - 알림 전송 불가");
        } else {
          try {
            webSocketService.sendCallEndNotification(callId, currentPartner.id);
            console.log("✅ 통화 종료 WebSocket 알림 전송 성공");
          } catch (wsError) {
            console.error("❌ 통화 종료 WebSocket 알림 전송 실패:", wsError);
            // WebSocket 전송 실패해도 통화 종료는 계속 진행
          }
        }
      } else {
        console.log("⚠️ partner 정보가 없어 WebSocket 알림 전송 건너뜀");
        console.log("🔍 currentPartner:", currentPartner);
      }

      // 5. 통화 상태 초기화
      endCall();

      // 6. Agora 콜백 정리 (다음 통화에서 잘못된 partner 정보로 비교하는 것을 방지)
      agoraService.setCallbacks({});
      console.log("✅ Agora 콜백 정리 완료");

      console.log("✅ 통화 종료 완료");
    } catch (error) {
      console.error("통화 종료 실패:", error);
      setError(
        error instanceof Error ? error.message : "통화 종료에 실패했습니다.",
      );
    }
  }, [
    agoraService,
    endCall,
    setError,
    callId,
    matchingApiService,
    partner,
    webSocketService,
  ]);

  /**
   * 마이크 토글
   */
  const toggleMute = useCallback(async () => {
    try {
      await agoraService.toggleMute();
      updateAgoraState(agoraService.getCallState());
    } catch (error) {
      console.error("마이크 토글 실패:", error);
      setError(
        error instanceof Error ? error.message : "마이크 제어에 실패했습니다.",
      );
    }
  }, [agoraService, updateAgoraState, setError]);

  /**
   * 스피커폰 토글
   */
  const toggleSpeaker = useCallback(async () => {
    try {
      await agoraService.toggleSpeaker();
      updateAgoraState(agoraService.getCallState());
    } catch (error) {
      console.error("스피커폰 토글 실패:", error);
      setError(
        error instanceof Error
          ? error.message
          : "스피커폰 제어에 실패했습니다.",
      );
    }
  }, [agoraService, updateAgoraState, setError]);

  /**
   * 음량 설정
   */
  const setVolume = useCallback(
    async (volume: number) => {
      try {
        await agoraService.setVolume(volume);
        updateAgoraState(agoraService.getCallState());
      } catch (error) {
        console.error("음량 설정 실패:", error);
        setError(
          error instanceof Error ? error.message : "음량 설정에 실패했습니다.",
        );
      }
    },
    [agoraService, updateAgoraState, setError],
  );

  /**
   * 통화 시간 계산
   */
  const getCallDuration = useCallback(() => {
    if (!callStartTime) return 0;
    return Math.floor((Date.now() - callStartTime.getTime()) / 1000);
  }, [callStartTime]);

  /**
   * WebSocket 통화 종료 알림 처리
   */
  const handleCallEndNotification = useCallback(
    (notification: any) => {
      console.log("🔔 useCall - 통화 종료 알림 수신:", notification);
      console.log("🔔 현재 callId:", callId);
      console.log("🔔 알림 callId:", notification.callId);

      // 상대방이 통화를 종료한 경우 처리
      if (notification.type === "call_end" && notification.callId === callId) {
        console.log("📞 상대방이 통화를 종료했습니다 - 처리 시작");

        // Agora 채널에서 퇴장 (에러 무시)
        agoraService.leaveChannel().catch((error) => {
          console.log(
            "Agora 채널 퇴장 중 에러 (정상적인 상황일 수 있음):",
            error,
          );
        });

        // 통화 상태 초기화
        endCall();
        console.log("📞 통화 종료 처리 완료");
      } else {
        console.log("📞 통화 종료 알림이지만 현재 통화와 다름 - 무시");
      }
    },
    [callId, agoraService, endCall],
  );

  /**
   * WebSocket 통화 시작 알림 구독
   * 주의: ConnectingCallPage에서 직접 콜백을 설정하므로 여기서는 제거
   */
  // useEffect(() => {
  //   // 통화 시작 알림 콜백 설정
  //   webSocketService.onCallStartNotificationCallback(handleCallStart);

  //   return () => {
  //     // 정리 함수는 필요시에만 구현
  //   };
  // }, [webSocketService, handleCallStart]);

  /**
   * WebSocket 통화 종료 알림 구독
   */
  useEffect(() => {
    console.log("🔔 useCall - 통화 종료 알림 콜백 설정");
    // 통화 종료 알림 콜백 설정
    webSocketService.onCallEndNotificationCallback(handleCallEndNotification);

    return () => {
      console.log("🔔 useCall - 통화 종료 알림 콜백 정리");
      // 정리 함수는 필요시에만 구현
    };
  }, [webSocketService, handleCallEndNotification]);

  /**
   * 컴포넌트 언마운트 시 정리
   * 주의: 페이지 이동 시 자동으로 통화를 종료하지 않음
   */
  // useEffect(() => {
  //   return () => {
  //     // 통화 중이면 정리
  //     if (isInCall) {
  //       agoraService.leaveChannel().catch(console.error);
  //     }
  //   };
  // }, [isInCall, agoraService]);

  return {
    // 상태
    callId,
    matchingId,
    partner,
    agoraChannelInfo,
    isInCall,
    isConnecting,
    agoraState,
    error,
    callDuration: getCallDuration(),

    // 액션
    handleCallStart,
    handleEndCall,
    toggleMute,
    toggleSpeaker,
    setVolume,
    setError,
    clearPartner,
  };
};
