import { useEffect, useCallback, useRef } from "react";
import { useCallStore } from "./callStore";
import {
  getAgoraService,
  AgoraCallbacks,
  NetworkQualityState,
} from "./agoraService";
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

  // 중복 알림 방지를 위한 ref
  const processedCallIds = useRef<Set<number>>(new Set());

  // 최대 통화 시간 제한 (60분)
  const MAX_CALL_DURATION = 60 * 60 * 1000; // 60분
  const maxCallDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 디버깅: partner 정보 변경 시에만 로그 출력 (개발 환경에서만)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🎣 useCall 훅 - partner 정보:", partner);
    }
  }, [partner]);

  const agoraService = getAgoraService();
  const webSocketService = getWebSocketService();
  const matchingApiService = getMatchingApiService();

  /**
   * RTC 토큰 갱신 처리 (Agora 토큰 만료 30초 전)
   */
  const handleTokenRenewal = useCallback(async () => {
    try {
      if (!callId) {
        console.error("❌ callId가 없어 토큰 갱신 불가");
        return;
      }

      if (import.meta.env.DEV) {
        console.log("🔄 RTC 토큰 갱신 시작");
      }

      // 토큰 설정 (갱신된 토큰 포함)
      const { getStoredToken } = await import("./auth");
      const token = getStoredToken();
      if (token) {
        matchingApiService.setToken(token);
      }

      // 백엔드에 RTC 토큰 갱신 요청
      const result = await matchingApiService.renewRtcToken(callId);

      if (import.meta.env.DEV) {
        console.log("✅ 백엔드에서 새 RTC 토큰 받음");
      }

      // Agora SDK에 새 토큰 적용
      await agoraService.renewToken(result.rtcToken);

      if (import.meta.env.DEV) {
        console.log("✅ RTC 토큰 갱신 완료");
      }
    } catch (error) {
      console.error("❌ RTC 토큰 갱신 실패:", error);
      setError(
        "통화 토큰 갱신에 실패했습니다. 잠시 후 통화가 종료될 수 있습니다.",
      );
      // 토큰 갱신 실패 시 사용자에게 알림 - 30초 내에 수동으로 종료할 수 있도록
    }
  }, [callId, matchingApiService, agoraService, setError]);

  /**
   * RTC 토큰 만료됨 처리 (긴급)
   */
  const handleTokenExpired = useCallback(async () => {
    console.error("❌ RTC 토큰이 만료되었습니다 - 통화 강제 종료");
    setError("통화 토큰이 만료되어 통화가 종료됩니다.");

    // Agora 연결 해제 (handleEndCall 대신 직접 처리하여 순환 참조 방지)
    try {
      await agoraService.leaveChannel();
      endCall();
    } catch (error) {
      console.error("토큰 만료 후 통화 종료 실패:", error);
    }
  }, [setError, agoraService, endCall]);

  /**
   * 최대 통화 시간 타이머 시작
   */
  const startMaxCallDurationTimer = useCallback(() => {
    // 기존 타이머 정리
    if (maxCallDurationTimerRef.current) {
      clearTimeout(maxCallDurationTimerRef.current);
    }

    // 60분 후 자동 종료
    maxCallDurationTimerRef.current = setTimeout(() => {
      console.warn("⚠️ 최대 통화 시간(60분) 초과 - 자동 종료 (비용 방어)");
      setError("최대 통화 시간(60분)이 초과되어 통화가 자동 종료되었습니다.");
      handleEndCall();
    }, MAX_CALL_DURATION);

    if (import.meta.env.DEV) {
      console.log("⏰ 최대 통화 시간 타이머 시작 (60분)");
    }
  }, [setError]);

  /**
   * 최대 통화 시간 타이머 정리
   */
  const clearMaxCallDurationTimer = useCallback(() => {
    if (maxCallDurationTimerRef.current) {
      clearTimeout(maxCallDurationTimerRef.current);
      maxCallDurationTimerRef.current = null;
      if (import.meta.env.DEV) {
        console.log("⏰ 최대 통화 시간 타이머 정리");
      }
    }
  }, []);

  /**
   * 통화 시작 (WebSocket 알림 수신 시)
   */
  const handleCallStart = useCallback(
    async (notification: CallStartNotification) => {
      try {
        // 중복 알림 방지 - callId 기반 체크
        if (
          notification.callId &&
          processedCallIds.current.has(notification.callId)
        ) {
          if (import.meta.env.DEV) {
            console.log(
              "⚠️ useCall: 이미 처리된 알림 - 무시",
              notification.callId,
            );
          }
          return;
        }

        // 이미 통화 중이거나 연결 중인지 확인
        if (isInCall || isConnecting) {
          if (import.meta.env.DEV) {
            console.log("⚠️ 이미 통화 중이거나 연결 중 - 통화 시작 건너뜀");
          }
          return;
        }

        // 알림 처리 표시
        if (notification.callId) {
          processedCallIds.current.add(notification.callId);
        }

        if (import.meta.env.DEV) {
          console.log("🎯 통화 시작 알림 수신");
          console.log("📋 알림 상세 정보:", {
            type: notification.type,
            callId: notification.callId,
            matchingId: notification.matchingId,
            partnerNickname: notification.partnerNickname,
            timestamp: notification.timestamp,
          });
        }

        // 통화 상태 업데이트
        if (import.meta.env.DEV) {
          console.log("🔄 useCall에서 startCall 호출");
        }
        startCall(notification);
        updateConnectingState(true);

        // Agora 콜백 설정
        const agoraCallbacks: AgoraCallbacks = {
          onConnectionStateChange: (state) => {
            if (import.meta.env.DEV) {
              console.log("Agora 연결 상태 변경:", state);
            }
            updateAgoraState(agoraService.getCallState());
          },
          onUserJoined: (userId) => {
            if (import.meta.env.DEV) {
              console.log("사용자 입장:", userId);
            }
          },
          onTokenPrivilegeWillExpire: () => {
            // 토큰이 30초 후 만료 - 갱신 시도
            if (import.meta.env.DEV) {
              console.log("⚠️ RTC 토큰 30초 후 만료 - 갱신 시도");
            }
            handleTokenRenewal();
          },
          onTokenPrivilegeDidExpire: () => {
            // 토큰이 만료됨 - 통화 종료
            console.error("❌ RTC 토큰 만료 - 통화 종료");
            handleTokenExpired();
          },
          onNetworkQualityChange: (quality: NetworkQualityState) => {
            // 네트워크 품질 변경 시 상태 업데이트
            updateAgoraState(agoraService.getCallState());

            // 네트워크 품질이 매우 나쁠 때 사용자에게 경고
            if (
              quality.uplinkNetworkQuality >= 5 ||
              quality.downlinkNetworkQuality >= 5
            ) {
              if (import.meta.env.DEV) {
                console.warn("⚠️ 네트워크 품질이 매우 나쁩니다");
              }
              // 사용자에게 경고 (에러는 아니므로 setError 대신 별도 처리 가능)
            }
          },
          onUserLeft: (userId) => {
            if (import.meta.env.DEV) {
              console.log("사용자 퇴장:", userId);
            }

            // 현재 상태를 직접 가져와서 클로저 문제 해결
            const currentState = useCallStore.getState();
            if (import.meta.env.DEV) {
              console.log("🔍 현재 partner 정보:", currentState.partner);
              console.log("🔍 퇴장한 userId:", userId);
            }

            // 상대방이 퇴장한 경우 통화 종료 처리
            if (
              currentState.partner?.id &&
              String(userId) === String(currentState.partner.id)
            ) {
              if (import.meta.env.DEV) {
                console.log("📞 상대방이 퇴장했습니다 - 통화 종료 처리 시작");
              }

              // 상대방 퇴장 시에도 WebSocket 알림 전송 (상대방이 예상치 못하게 퇴장한 경우)
              if (currentState.callId && currentState.partner.id) {
                if (import.meta.env.DEV) {
                  console.log("📡 상대방 퇴장으로 인한 WebSocket 알림 전송");
                }
                try {
                  webSocketService.sendCallEndNotification(
                    currentState.callId,
                    currentState.partner.id,
                  );
                  if (import.meta.env.DEV) {
                    console.log("✅ 상대방 퇴장 WebSocket 알림 전송 성공");
                  }
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
              if (import.meta.env.DEV) {
                console.log("📞 상대방 퇴장으로 인한 통화 종료 처리 완료");
              }
            } else {
              if (import.meta.env.DEV) {
                console.log("⚠️ partner 정보가 없거나 다른 사용자 퇴장 - 무시");
              }
            }
          },
          onAudioTrackSubscribed: (userId, audioTrack) => {
            if (import.meta.env.DEV) {
              console.log("오디오 트랙 구독:", userId);
            }
            updateAgoraState(agoraService.getCallState());
          },
          onAudioTrackUnsubscribed: (userId) => {
            if (import.meta.env.DEV) {
              console.log("오디오 트랙 구독 해제:", userId);
            }
            updateAgoraState(agoraService.getCallState());
          },
          onCallStarted: () => {
            if (import.meta.env.DEV) {
              console.log("Agora 통화 시작");
            }
            updateConnectingState(false);
            updateAgoraState(agoraService.getCallState());

            // 최대 통화 시간 타이머 시작
            startMaxCallDurationTimer();
          },
          onCallEnded: () => {
            if (import.meta.env.DEV) {
              console.log("Agora 통화 종료");
            }
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

        if (import.meta.env.DEV) {
          console.log("🔄 Agora 채널 입장 시작");
        }

        // Agora 채널에 입장
        try {
          await agoraService.joinChannel(agoraChannelInfo);
          if (import.meta.env.DEV) {
            console.log("✅ Agora 채널 입장 완료");
          }
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
      isInCall,
      isConnecting,
      startMaxCallDurationTimer,
      handleTokenRenewal,
      handleTokenExpired,
    ],
  );

  /**
   * 통화 종료
   */
  const handleEndCall = useCallback(async () => {
    try {
      if (import.meta.env.DEV) {
        console.log("통화 종료 요청");
      }

      if (!callId) {
        if (import.meta.env.DEV) {
          console.log("❌ callId가 없어 통화 종료 불가");
        }
        return;
      }

      // partner 정보를 미리 저장 (WebSocket 알림 전송용)
      const currentPartner = partner;

      // 1. 통화 통계 수집 (Agora 연결 해제 전에 수집해야 함!)
      if (import.meta.env.DEV) {
        console.log("📊 1. 통화 통계 수집");
      }
      let callStatistics = null;
      try {
        callStatistics = await agoraService.getCallStatistics();
        if (import.meta.env.DEV && callStatistics) {
          console.log("✅ 1. 통화 통계 수집 완료:", {
            duration: `${callStatistics.duration}초`,
            데이터사용량: `${Math.round(((callStatistics.sendBytes || 0) + (callStatistics.receiveBytes || 0)) / 1024)}KB`,
          });
        }
      } catch (statsError) {
        console.error("⚠️ 통화 통계 수집 실패 (무시):", statsError);
      }

      // 2. Agora 연결 해제
      if (import.meta.env.DEV) {
        console.log("📞 2. Agora 채널에서 퇴장 시작");
      }
      await agoraService.leaveChannel();
      if (import.meta.env.DEV) {
        console.log("✅ 2. Agora 채널 퇴장 완료");
      }

      // 3. 통화 통계 백엔드로 전송 (비동기, 실패해도 계속 진행)
      if (callStatistics) {
        if (import.meta.env.DEV) {
          console.log("📡 3. 통화 통계 백엔드 전송");
        }
        try {
          // 토큰 설정
          const { getStoredToken } = await import("./auth");
          const token = getStoredToken();
          if (token) {
            matchingApiService.setToken(token);
          }

          // 네트워크 품질 설명 생성
          const uplinkQuality =
            callStatistics.lastNetworkQuality?.uplinkNetworkQuality || 0;
          const downlinkQuality =
            callStatistics.lastNetworkQuality?.downlinkNetworkQuality || 0;

          const getQualityLabel = (q: number): string => {
            if (q === 0) return "측정중";
            if (q <= 2) return "좋음";
            if (q === 3) return "보통";
            if (q === 4) return "나쁨";
            return "매우나쁨";
          };

          const networkQualityDescription = `업링크: ${getQualityLabel(uplinkQuality)}, 다운링크: ${getQualityLabel(downlinkQuality)}`;

          // 총 데이터 사용량 (MB)
          const totalBytes =
            (callStatistics.sendBytes || 0) +
            (callStatistics.receiveBytes || 0);
          const totalDataUsageMB = Number(
            (totalBytes / (1024 * 1024)).toFixed(2),
          );

          // 평균 네트워크 품질 (0-6 사이, 낮을수록 좋음)
          const averageNetworkQuality = Number(
            ((uplinkQuality + downlinkQuality) / 2).toFixed(1),
          );

          await matchingApiService.sendCallStatistics(callId, {
            duration: callStatistics.duration || 0,
            sendBytes: callStatistics.sendBytes || 0,
            receiveBytes: callStatistics.receiveBytes || 0,
            sendBitrate: callStatistics.sendBitrate || 0,
            receiveBitrate: callStatistics.receiveBitrate || 0,
            audioSendBytes: callStatistics.audioSendBytes || 0,
            audioReceiveBytes: callStatistics.audioReceiveBytes || 0,
            uplinkNetworkQuality: uplinkQuality,
            downlinkNetworkQuality: downlinkQuality,
            networkQualityDescription,
            totalDataUsageMB,
            averageNetworkQuality,
          });
          if (import.meta.env.DEV) {
            console.log("✅ 3. 통화 통계 전송 완료");
          }
        } catch (statsError) {
          // 통계 전송 실패는 무시 (사용자 경험에 영향 없음)
          if (import.meta.env.DEV) {
            console.log("⚠️ 3. 통화 통계 전송 실패 (무시):", statsError);
          }
        }
      }

      // 4. 채널 나가기 API 호출
      if (import.meta.env.DEV) {
        console.log("📡 4. 백엔드 채널 나가기 API 호출");
      }
      try {
        // 토큰 설정 (갱신된 토큰 포함)
        const { getStoredToken } = await import("./auth");
        const token = getStoredToken();
        if (token) {
          matchingApiService.setToken(token);
          if (import.meta.env.DEV) {
            console.log("🔑 matchingApiService에 토큰 설정 완료");
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn("⚠️ 토큰이 없어 API 호출을 건너뜁니다");
          }
        }

        await matchingApiService.leaveChannel(callId);
        if (import.meta.env.DEV) {
          console.log("✅ 4. 채널 나가기 API 호출 성공");
        }
      } catch (apiError) {
        console.error("❌ 4. 채널 나가기 API 호출 실패:", apiError);
        // API 호출 실패해도 통화 종료는 계속 진행
      }

      // 5. 통화 종료 API 호출
      if (import.meta.env.DEV) {
        console.log("📡 5. 백엔드 통화 종료 API 호출");
      }
      try {
        // 토큰 설정 (갱신된 토큰 포함)
        const { getStoredToken } = await import("./auth");
        const token = getStoredToken();
        if (token) {
          matchingApiService.setToken(token);
          if (import.meta.env.DEV) {
            console.log("🔑 matchingApiService에 토큰 설정 완료");
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn("⚠️ 토큰이 없어 API 호출을 건너뜁니다");
          }
        }

        await matchingApiService.endCall(callId);
        if (import.meta.env.DEV) {
          console.log("✅ 5. 통화 종료 API 호출 성공");
        }
      } catch (apiError) {
        // 409 Conflict (이미 종료된 통화)는 정상적인 상황으로 처리
        if (
          apiError instanceof Error &&
          apiError.message.includes("이미 종료된 통화")
        ) {
          if (import.meta.env.DEV) {
            console.log("ℹ️ 통화가 이미 종료됨 - 정상적인 상황");
          }
        } else {
          console.error("❌ 5. 통화 종료 API 호출 실패:", apiError);
        }
        // API 호출 실패해도 통화 상태 초기화는 계속 진행
      }

      // 6. 상대방에게 통화 종료 WebSocket 알림 전송 (저장된 partner 정보 사용)
      if (currentPartner?.id) {
        if (import.meta.env.DEV) {
          console.log("📡 상대방에게 통화 종료 알림 전송");
        }

        // WebSocket 연결 상태 확인
        const wsConnectionState = webSocketService.getConnectionState();
        if (import.meta.env.DEV) {
          console.log(
            "🔍 WebSocket 연결 상태:",
            wsConnectionState.isConnected ? "연결됨" : "연결 안됨",
          );
        }

        if (!wsConnectionState.isConnected) {
          console.error("❌ WebSocket이 연결되지 않음 - 알림 전송 불가");
        } else {
          try {
            webSocketService.sendCallEndNotification(callId, currentPartner.id);
            if (import.meta.env.DEV) {
              console.log("✅ 통화 종료 WebSocket 알림 전송 성공");
            }
          } catch (wsError) {
            console.error("❌ 통화 종료 WebSocket 알림 전송 실패:", wsError);
            // WebSocket 전송 실패해도 통화 종료는 계속 진행
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.log("⚠️ partner 정보가 없어 WebSocket 알림 전송 건너뜀");
        }
      }

      // 7. 최대 통화 시간 타이머 정리
      clearMaxCallDurationTimer();

      // 8. Agora 콜백 정리 (다음 통화에서 잘못된 partner 정보로 비교하는 것을 방지)
      agoraService.setCallbacks({});
      if (import.meta.env.DEV) {
        console.log("✅ Agora 콜백 정리 완료");
      }

      // 9. 통화 상태 초기화
      endCall();

      // 10. 추가 대기 시간 (상태 정리 완료 보장)
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (import.meta.env.DEV) {
        console.log("✅ 통화 종료 완료");
      }
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
    clearMaxCallDurationTimer,
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
      if (import.meta.env.DEV) {
        console.log("🔔 useCall - 통화 종료 알림 수신");
        console.log("🔔 현재 callId:", callId);
        console.log("🔔 알림 callId:", notification.callId);
      }

      // 상대방이 통화를 종료한 경우 처리
      if (notification.type === "call_end" && notification.callId === callId) {
        if (import.meta.env.DEV) {
          console.log("📞 상대방이 통화를 종료했습니다 - 처리 시작");
        }

        // 최대 통화 시간 타이머 정리
        clearMaxCallDurationTimer();

        // Agora 채널에서 퇴장 (에러 무시)
        agoraService.leaveChannel().catch((error) => {
          if (import.meta.env.DEV) {
            console.log(
              "Agora 채널 퇴장 중 에러 (정상적인 상황일 수 있음):",
              error,
            );
          }
        });

        // 통화 상태 초기화
        endCall();
        if (import.meta.env.DEV) {
          console.log("📞 통화 종료 처리 완료");
        }
      } else {
        if (import.meta.env.DEV) {
          console.log("📞 통화 종료 알림이지만 현재 통화와 다름 - 무시");
        }
      }
    },
    [callId, agoraService, endCall, clearMaxCallDurationTimer],
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
    if (import.meta.env.DEV) {
      console.log("🔔 useCall - 통화 종료 알림 콜백 설정");
    }
    // 통화 종료 알림 콜백 설정
    webSocketService.onCallEndNotificationCallback(handleCallEndNotification);

    return () => {
      if (import.meta.env.DEV) {
        console.log("🔔 useCall - 통화 종료 알림 콜백 정리");
      }
      // 정리 함수는 필요시에만 구현
    };
  }, [webSocketService, handleCallEndNotification]);

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   */
  useEffect(() => {
    return () => {
      // 타이머 정리
      clearMaxCallDurationTimer();
    };
  }, [clearMaxCallDurationTimer]);

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
