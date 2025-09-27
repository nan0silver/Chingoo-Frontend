import { useEffect, useCallback } from "react";
import { useCallStore } from "./callStore";
import { getAgoraService, AgoraCallbacks } from "./agoraService";
import { getWebSocketService } from "./websocket";
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

  const agoraService = getAgoraService();
  const webSocketService = getWebSocketService();

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
          partner: notification.partner,
          agoraChannelInfo: notification.agoraChannelInfo,
          timestamp: notification.timestamp,
        });

        // 통화 상태 업데이트
        startCall(notification);
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
            endCall();
          },
          onError: (error) => {
            console.error("Agora 에러:", error);
            setError(error.message);
          },
        };

        agoraService.setCallbacks(agoraCallbacks);

        // Agora 채널에 입장
        if (notification.agoraChannelInfo) {
          await agoraService.joinChannel(notification.agoraChannelInfo);
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
  }, [agoraService, endCall, setError]);

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
   * WebSocket 통화 시작 알림 구독
   */
  useEffect(() => {
    // 통화 시작 알림 콜백 설정
    webSocketService.onCallStartNotificationCallback(handleCallStart);

    return () => {
      // 정리 함수는 필요시에만 구현
    };
  }, [webSocketService, handleCallStart]);

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      // 통화 중이면 정리
      if (isInCall) {
        agoraService.leaveChannel().catch(console.error);
      }
    };
  }, [isInCall, agoraService]);

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
