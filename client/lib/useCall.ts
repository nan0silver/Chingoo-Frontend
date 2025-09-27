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
  } = useCallStore();

  // 디버깅: useCall 훅에서 partner 정보 확인
  console.log("🎣 useCall 훅 - partner 정보:", partner);

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
            // WebSocket으로 상대방에게 통화 종료 알림 전송
            if (callId && partner?.id) {
              console.log("📡 상대방에게 통화 종료 알림 전송:", {
                callId,
                partnerId: partner.id,
              });
              try {
                webSocketService.sendCallEndNotification(callId, partner.id);
                console.log("✅ 통화 종료 WebSocket 알림 전송 성공");
              } catch (wsError) {
                console.error(
                  "❌ 통화 종료 WebSocket 알림 전송 실패:",
                  wsError,
                );
              }
            }
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

      // 백엔드에 통화 종료 API 호출
      if (callId) {
        console.log("📡 백엔드에 통화 종료 API 호출:", callId);
        try {
          await matchingApiService.endCall(callId);
          console.log("✅ 백엔드 통화 종료 API 호출 성공");
        } catch (apiError) {
          console.error("❌ 백엔드 통화 종료 API 호출 실패:", apiError);
          // API 호출 실패해도 Agora 채널 퇴장은 계속 진행
        }
      }

      // 상대방에게 통화 종료 WebSocket 알림 전송
      if (callId && partner?.id) {
        console.log("📡 상대방에게 통화 종료 알림 전송:", {
          callId,
          partnerId: partner.id,
        });
        try {
          webSocketService.sendCallEndNotification(callId, partner.id);
          console.log("✅ 통화 종료 WebSocket 알림 전송 성공");
        } catch (wsError) {
          console.error("❌ 통화 종료 WebSocket 알림 전송 실패:", wsError);
          // WebSocket 전송 실패해도 통화 종료는 계속 진행
        }
      }

      // Agora 채널에서 퇴장
      await agoraService.leaveChannel();

      // 통화 상태 초기화
      endCall();
    } catch (error) {
      console.error("통화 종료 실패:", error);
      setError(
        error instanceof Error ? error.message : "통화 종료에 실패했습니다.",
      );
    }
  }, [agoraService, endCall, setError, callId, matchingApiService]);

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
      console.log("🔔 통화 종료 알림 수신:", notification);

      // 상대방이 통화를 종료한 경우 처리
      if (notification.type === "call_end" && notification.callId === callId) {
        console.log("📞 상대방이 통화를 종료했습니다");

        // Agora 채널에서 퇴장
        agoraService.leaveChannel().catch(console.error);

        // 통화 상태 초기화
        endCall();
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
    // 통화 종료 알림 콜백 설정
    webSocketService.onCallEndNotificationCallback(handleCallEndNotification);

    return () => {
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
  };
};
