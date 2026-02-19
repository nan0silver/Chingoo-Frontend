import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  ConnectionState,
  ConnectionDisconnectedReason,
} from "agora-rtc-sdk-ng";
import { logger } from "./logger";

/**
 * 네트워크 품질 등급
 * Agora SDK 기준:
 * 0 = UNKNOWN (측정 중)
 * 1 = EXCELLENT (최고)
 * 2 = GOOD (좋음)
 * 3 = POOR (보통)
 * 4 = BAD (나쁨)
 * 5 = VERY_BAD (매우 나쁨)
 * 6 = DOWN (연결 끊김)
 */
export type NetworkQuality = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 네트워크 품질 상태
 */
export interface NetworkQualityState {
  uplinkNetworkQuality: NetworkQuality; // 업링크 (송신) 품질
  downlinkNetworkQuality: NetworkQuality; // 다운링크 (수신) 품질
}

/**
 * 통화 통계 정보
 */
export interface CallStatistics {
  // 기본 정보
  duration: number; // 통화 시간 (초)

  // 네트워크 통계
  sendBytes?: number; // 송신한 총 바이트
  receiveBytes?: number; // 수신한 총 바이트
  sendBitrate?: number; // 평균 송신 비트레이트 (kbps)
  receiveBitrate?: number; // 평균 수신 비트레이트 (kbps)

  // 패킷 손실률
  sendPacketsLost?: number; // 송신 패킷 손실 수
  receivePacketsLost?: number; // 수신 패킷 손실 수

  // 오디오 품질
  audioSendBytes?: number; // 오디오 송신 바이트
  audioReceiveBytes?: number; // 오디오 수신 바이트
  audioSendBitrate?: number; // 오디오 송신 비트레이트
  audioReceiveBitrate?: number; // 오디오 수신 비트레이트

  // 기타
  userCount?: number; // 채널 내 사용자 수
  lastNetworkQuality?: NetworkQualityState; // 마지막 네트워크 품질
}

/**
 * Agora 통화 상태
 */
export interface AgoraCallState {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  localAudioTrack: IMicrophoneAudioTrack | null;
  remoteAudioTrack: IRemoteAudioTrack | null;
  volume: number;
  connectionState: string;
  networkQuality: NetworkQualityState; // 네트워크 품질
}

/**
 * Agora 통화 콜백 인터페이스
 */
export interface AgoraCallbacks {
  onConnectionStateChange?: (state: string) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onAudioTrackSubscribed?: (
    userId: string,
    audioTrack: IRemoteAudioTrack,
  ) => void;
  onAudioTrackUnsubscribed?: (userId: string) => void;
  onError?: (error: Error) => void;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onTokenPrivilegeWillExpire?: () => void; // 토큰이 30초 후 만료될 때
  onTokenPrivilegeDidExpire?: () => void; // 토큰이 만료되었을 때
  onNetworkQualityChange?: (quality: NetworkQualityState) => void; // 네트워크 품질 변경
  onException?: (error: { code: string; msg: string; uid: string }) => void; // SDK 내부 예외
  onMicrophonePermissionDenied?: () => void; // 마이크 권한 거부
}

/**
 * Agora 채널 정보
 */
export interface AgoraChannelInfo {
  appId: string;
  channelName: string;
  token: string;
  /** Agora는 숫자 UID 사용을 권장함 (문자열 시 SDK 경고) */
  uid: string | number;
}

/**
 * Agora Web RTC 서비스 클래스
 */
export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private callState: AgoraCallState = {
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    isSpeakerOn: false, // 초기값: 스피커폰 OFF (귀에 대고 들을 수 있게)
    localAudioTrack: null,
    remoteAudioTrack: null,
    volume: 40, // 초기값: 작은 볼륨 (스피커폰 OFF 상태)
    connectionState: "DISCONNECTED",
    networkQuality: {
      uplinkNetworkQuality: 0, // UNKNOWN
      downlinkNetworkQuality: 0, // UNKNOWN
    },
  };
  private callbacks: AgoraCallbacks = {};
  private currentChannelInfo: AgoraChannelInfo | null = null;
  private isJoining = false; // 중복 입장 방지 플래그

  // 방어 로직을 위한 타이머들
  private inactivityTimer: NodeJS.Timeout | null = null; // 무응답 감지 타이머
  private lastActivityTime: number = Date.now(); // 마지막 활동 시간
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5분 무응답 시 자동 종료

  // 토큰 갱신 관련
  private isRenewingToken = false; // 토큰 갱신 중 플래그 (중복 방지)

  // 재시도 관련
  private microphoneRetryCount = 0; // 마이크 권한 재시도 횟수
  private readonly MAX_MICROPHONE_RETRY = 2; // 최대 재시도 횟수
  private reconnectAttempts = 0; // 재연결 시도 횟수
  private readonly MAX_RECONNECT_ATTEMPTS = 3; // 최대 재연결 시도 횟수
  private isReconnecting = false; // 재연결 중 플래그

  constructor() {
    // Agora SDK 초기화
    AgoraRTC.setLogLevel(4); // INFO 레벨로 설정

    // 통계 수집 비활성화 (네트워크 에러 방지)
    try {
      // @ts-ignore - SDK 버전에 따라 지원하지 않을 수 있음
      AgoraRTC.enableLogUpload(false);
    } catch (error) {
      // 에러 무시 (SDK 버전에 따라 지원하지 않을 수 있음)
      if (import.meta.env.DEV) {
        logger.log("⚠️ Agora 로그 업로드 비활성화 실패:", error);
      }
    }

    // 프로덕션 환경에서 추가 설정
    if (!import.meta.env.DEV) {
      try {
        // 프로덕션에서는 더 높은 로그 레벨로 설정 (에러만 출력)
        AgoraRTC.setLogLevel(2); // ERROR 레벨로 설정
      } catch (error) {
        // 에러 무시
      }
    }
  }

  /**
   * 콜백 설정
   */
  setCallbacks(callbacks: AgoraCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 현재 통화 상태 반환
   */
  getCallState(): AgoraCallState {
    return { ...this.callState };
  }

  /**
   * 채널에 입장
   */
  async joinChannel(channelInfo: AgoraChannelInfo): Promise<void> {
    // 중복 입장 방지
    if (this.isJoining) {
      if (import.meta.env.DEV) {
        logger.log("⚠️ 이미 입장 중 - 중복 요청 무시");
      }
      return;
    }

    try {
      this.isJoining = true;

      // 개발 환경에서만 상세 로그 출력 (보안상 프로덕션에서는 민감 정보 숨김)
      if (import.meta.env.DEV) {
        logger.log("🎯 Agora 채널 입장 시도");
        logger.log("📋 채널 정보 상세:", {
          appId: channelInfo.appId ? "앱 ID 있음" : "앱 ID 없음",
          channelName: channelInfo.channelName ? "채널명 있음" : "채널명 없음",
          token: channelInfo.token ? "토큰 있음" : "토큰 없음",
          uid: channelInfo.uid,
        });
      }

      // 이미 연결 중이거나 연결된 상태인지 확인
      if (
        this.callState.isConnecting ||
        this.callState.isConnected ||
        this.client
      ) {
        if (import.meta.env.DEV) {
          logger.log(
            "⚠️ 이미 연결 중이거나 연결된 상태 - 기존 연결 정리 후 재시도",
          );
        }
        // 기존 연결을 완전히 정리
        await this.forceLeaveChannel();

        // 추가 대기 시간 (리소스 정리 완료 보장)
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      this.callState.isConnecting = true;
      this.currentChannelInfo = channelInfo;

      // 클라이언트 생성 (기존 클라이언트가 완전히 정리되었는지 확인)
      if (this.client) {
        if (import.meta.env.DEV) {
          logger.log("⚠️ 기존 클라이언트가 아직 존재 - 강제 정리");
        }
        this.client = null;
      }

      if (import.meta.env.DEV) {
        logger.log("🔧 Agora 클라이언트 생성 중...");
      }
      this.client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      });

      // 클라이언트별 추가 설정 (통계 수집 관련 에러 방지)
      try {
        // 통계 수집 비활성화
        if (this.client.enableDualStream) {
          // 일부 SDK 버전에서 지원하는 설정
          if (import.meta.env.DEV) {
            logger.log("🔧 Agora 클라이언트 추가 설정 적용");
          }
        }
      } catch (error) {
        // 에러 무시 (SDK 버전에 따라 지원하지 않을 수 있음)
        if (import.meta.env.DEV) {
          logger.log("⚠️ Agora 클라이언트 추가 설정 실패:", error);
        }
      }

      // 이벤트 리스너 설정
      if (import.meta.env.DEV) {
        logger.log("📡 이벤트 리스너 설정 중...");
      }
      this.setupEventListeners();

      // 마이크 권한 요청 및 오디오 트랙 생성
      if (import.meta.env.DEV) {
        logger.log("🎤 마이크 권한 요청 및 오디오 트랙 생성 중...");
      }
      await this.createLocalAudioTrack();

      // 채널에 입장
      if (import.meta.env.DEV) {
        logger.log("🚪 Agora 채널에 입장 중...");
      }
      // Agora는 숫자 UID 사용을 권장함 (문자열 사용 시 SDK 경고 발생)
      const uid =
        typeof channelInfo.uid === "number"
          ? channelInfo.uid
          : Number(channelInfo.uid);
      await this.client.join(
        channelInfo.appId,
        channelInfo.channelName,
        channelInfo.token,
        Number.isNaN(uid) ? channelInfo.uid : uid,
      );

      if (import.meta.env.DEV) {
        logger.log("✅ Agora 채널 입장 성공");
      }

      // 로컬 오디오 트랙을 채널에 발행 (publish)
      if (import.meta.env.DEV) {
        logger.log("📢 로컬 오디오 트랙을 채널에 발행 중...");
      }
      if (this.callState.localAudioTrack) {
        await this.client.publish([this.callState.localAudioTrack]);
        if (import.meta.env.DEV) {
          logger.log("✅ 로컬 오디오 트랙 발행 성공");
        }
      } else {
        logger.error("❌ 로컬 오디오 트랙이 없어서 발행할 수 없음");
      }

      this.callState.isConnected = true;
      this.callState.isConnecting = false;

      // 통화 시작 시 스피커폰 상태를 OFF로 초기화 (귀에 대고 들을 수 있게)
      this.callState.isSpeakerOn = false;
      this.callState.volume = 40;

      if (import.meta.env.DEV) {
        logger.log("🔔 onCallStarted 콜백 호출 중...");
      }
      this.callbacks.onCallStarted?.();
      if (import.meta.env.DEV) {
        logger.log("✅ onCallStarted 콜백 호출 완료");
      }

      // 무응답 감지 타이머 시작
      this.startInactivityTimer();
      if (import.meta.env.DEV) {
        logger.log("⏰ 무응답 감지 타이머 시작 (5분)");
      }

      // 입장 완료 - 플래그 해제
      this.isJoining = false;
    } catch (error) {
      logger.error("❌ Agora 채널 입장 실패:", error);
      this.callState.isConnecting = false;
      this.isJoining = false; // 에러 시에도 플래그 해제
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 강제로 채널에서 퇴장 (중복 입장 방지용)
   */
  private async forceLeaveChannel(): Promise<void> {
    try {
      if (import.meta.env.DEV) {
        logger.log("🔄 강제 채널 퇴장 시작");
      }

      // 1. 로컬 오디오 트랙 정리
      if (this.callState.localAudioTrack) {
        try {
          if (this.client) {
            await this.client.unpublish([this.callState.localAudioTrack]);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.log("⚠️ unpublish 에러 무시:", error);
          }
        }

        try {
          this.callState.localAudioTrack.stop();
          this.callState.localAudioTrack.close();
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.log("⚠️ 오디오 트랙 정리 에러 무시:", error);
          }
        }
        this.callState.localAudioTrack = null;
      }

      // 2. 클라이언트 퇴장 (타임아웃 설정)
      if (this.client) {
        try {
          // 통계 수집 비활성화 (퇴장 전)
          try {
            // @ts-ignore - 클라이언트 레벨에서는 지원하지 않을 수 있음
            if (typeof this.client.enableLogUpload === "function") {
              // @ts-ignore
              this.client.enableLogUpload(false);
            }
          } catch (logError) {
            // 에러 무시
          }

          // 3초 타임아웃으로 leave 시도
          const leavePromise = this.client.leave();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Leave timeout")), 3000),
          );

          await Promise.race([leavePromise, timeoutPromise]);

          if (import.meta.env.DEV) {
            logger.log("✅ 클라이언트 퇴장 성공");
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.log("⚠️ 클라이언트 퇴장 에러 무시:", error);
          }
        }

        // 클라이언트를 null로 설정 (중요!)
        this.client = null;
      }

      // 3. 타이머 정리
      this.stopInactivityTimer();

      // 4. 상태 완전 초기화
      this.callState.isConnected = false;
      this.callState.isConnecting = false;
      this.callState.connectionState = "DISCONNECTED";
      this.callState.remoteAudioTrack = null;
      this.currentChannelInfo = null;
      this.isJoining = false;

      // 4. 잠시 대기 (리소스 정리 시간 확보)
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (import.meta.env.DEV) {
        logger.log("✅ 강제 채널 퇴장 완료");
      }
    } catch (error) {
      logger.error("❌ 강제 채널 퇴장 실패:", error);
      // 실패해도 상태는 강제 초기화
      this.stopInactivityTimer();
      this.callState.isConnected = false;
      this.callState.isConnecting = false;
      this.callState.connectionState = "DISCONNECTED";
      this.callState.localAudioTrack = null;
      this.callState.remoteAudioTrack = null;
      this.currentChannelInfo = null;
      this.client = null;
      this.isJoining = false;
    }
  }

  /**
   * 무응답 감지 타이머 시작
   */
  private startInactivityTimer(): void {
    // 기존 타이머 정리
    this.stopInactivityTimer();

    // 마지막 활동 시간 갱신
    this.lastActivityTime = Date.now();

    // 새 타이머 시작
    this.inactivityTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivityTime;

      if (timeSinceLastActivity >= this.INACTIVITY_TIMEOUT) {
        logger.warn("⚠️ 5분간 활동이 없어 통화를 자동 종료합니다 (비용 방어)");
        this.handleInactivityTimeout();
      }
    }, 30000); // 30초마다 체크
  }

  /**
   * 무응답 감지 타이머 정지
   */
  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * 활동 시간 갱신 (5분 무응답 타이머 리셋용).
   * 호출처: 원격 트랙 구독 시, network-quality(2초마다) - 연결 유지 중이면 계속 갱신됨.
   */
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * 무응답 타임아웃 처리
   */
  private async handleInactivityTimeout(): Promise<void> {
    try {
      logger.warn("🚨 무응답 타임아웃 - 통화 자동 종료");

      // 에러 콜백 호출
      this.callbacks.onError?.(
        new Error("장시간 활동이 없어 통화가 자동 종료되었습니다."),
      );

      // 채널에서 퇴장
      await this.leaveChannel();
    } catch (error) {
      logger.error("무응답 타임아웃 처리 실패:", error);
    }
  }

  /**
   * 채널에서 퇴장
   */
  async leaveChannel(): Promise<void> {
    try {
      if (import.meta.env.DEV) {
        logger.log("Agora 채널 퇴장");
      }

      // 무응답 감지 타이머 정지
      this.stopInactivityTimer();

      // 로컬 오디오 트랙 발행 해제 및 해제
      if (this.callState.localAudioTrack && this.client) {
        if (import.meta.env.DEV) {
          logger.log("📢 로컬 오디오 트랙 발행 해제 중...");
        }
        try {
          await this.client.unpublish([this.callState.localAudioTrack]);
          if (import.meta.env.DEV) {
            logger.log("✅ 로컬 오디오 트랙 발행 해제 완료");
          }
        } catch (error) {
          logger.error("❌ 로컬 오디오 트랙 발행 해제 실패:", error);
        }

        // unpublish 후 트랙이 이미 정리되었을 수 있으므로 안전하게 처리
        const localAudioTrack = this.callState.localAudioTrack;
        this.callState.localAudioTrack = null; // 먼저 null로 설정하여 중복 정리 방지
        
        try {
          if (localAudioTrack && typeof localAudioTrack.stop === "function") {
            localAudioTrack.stop();
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.warn("⚠️ 로컬 오디오 트랙 stop 실패 (정상적인 상황일 수 있음):", error);
          }
        }
        
        try {
          if (localAudioTrack && typeof localAudioTrack.close === "function") {
            localAudioTrack.close();
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.warn("⚠️ 로컬 오디오 트랙 close 실패 (정상적인 상황일 수 있음):", error);
          }
        }
      }

      // 리모트 오디오 트랙 해제
      if (this.callState.remoteAudioTrack) {
        const remoteAudioTrack = this.callState.remoteAudioTrack;
        this.callState.remoteAudioTrack = null; // 먼저 null로 설정하여 중복 정리 방지
        
        try {
          if (remoteAudioTrack && typeof remoteAudioTrack.stop === "function") {
            remoteAudioTrack.stop();
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.warn("⚠️ 리모트 오디오 트랙 stop 실패 (정상적인 상황일 수 있음):", error);
          }
        }
      }

      // 클라이언트에서 퇴장
      if (this.client) {
        try {
          // 통계 수집 비활성화 (퇴장 전)
          try {
            // @ts-ignore - 클라이언트 레벨에서는 지원하지 않을 수 있음
            if (typeof this.client.enableLogUpload === "function") {
              // @ts-ignore
              this.client.enableLogUpload(false);
            }
          } catch (logError) {
            // 에러 무시
          }

          await this.client.leave();
        } catch (error) {
          logger.error("❌ 클라이언트 퇴장 실패:", error);
        }
        this.client = null;
      }

      // 상태 초기화
      this.callState = {
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isSpeakerOn: false, // 초기값: 스피커폰 OFF
        localAudioTrack: null,
        remoteAudioTrack: null,
        volume: 40, // 초기값: 작은 볼륨 (스피커폰 OFF 상태)
        connectionState: "DISCONNECTED",
        networkQuality: {
          uplinkNetworkQuality: 0,
          downlinkNetworkQuality: 0,
        },
      };
      this.isJoining = false;

      this.currentChannelInfo = null;
      this.callbacks.onCallEnded?.();

      if (import.meta.env.DEV) {
        logger.log("Agora 채널 퇴장 완료");
      }
    } catch (error) {
      logger.error("Agora 채널 퇴장 실패:", error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 마이크 음소거/해제
   */
  async toggleMute(): Promise<boolean> {
    try {
      if (!this.callState.localAudioTrack) {
        throw new Error("로컬 오디오 트랙이 없습니다.");
      }

      const newMutedState = !this.callState.isMuted;
      await this.callState.localAudioTrack.setMuted(newMutedState);

      this.callState.isMuted = newMutedState;
      if (import.meta.env.DEV) {
        logger.log(`마이크 ${newMutedState ? "음소거" : "해제"}`);
      }

      return newMutedState;
    } catch (error) {
      logger.error("마이크 토글 실패:", error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 마이크 음소거 상태 설정
   */
  async setMuted(muted: boolean): Promise<void> {
    try {
      if (!this.callState.localAudioTrack) {
        throw new Error("로컬 오디오 트랙이 없습니다.");
      }

      await this.callState.localAudioTrack.setMuted(muted);
      this.callState.isMuted = muted;
      if (import.meta.env.DEV) {
        logger.log(`마이크 ${muted ? "음소거" : "해제"}`);
      }
    } catch (error) {
      logger.error("마이크 상태 설정 실패:", error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 스피커폰 토글
   */
  async toggleSpeaker(): Promise<boolean> {
    try {
      const newSpeakerState = !this.callState.isSpeakerOn;

      // 스피커폰 상태에 따른 볼륨 설정
      // OFF: 작은 볼륨 (40%) - 귀에 대고 들을 수 있게
      // ON: 큰 볼륨 (100%) - 핸드폰을 떼고도 들을 수 있게
      const speakerVolume = newSpeakerState ? 100 : 40;

      // 리모트 오디오 트랙 볼륨 조절 (상대방 목소리)
      if (this.callState.remoteAudioTrack) {
        try {
          // 볼륨 설정 (가장 중요 - 먼저 설정)
          await this.callState.remoteAudioTrack.setVolume(speakerVolume);
          if (import.meta.env.DEV) {
            logger.log(`리모트 오디오 트랙 볼륨 설정: ${speakerVolume}%`);
          }

          // 방법 1: HTMLAudioElement의 setSinkId 사용 (브라우저 지원 필요)
          // 리모트 오디오 트랙이 재생 중인 HTMLAudioElement 찾기
          const audioElements = document.querySelectorAll("audio");
          let audioElement: HTMLAudioElement | null = null;

          for (const element of audioElements) {
            // Agora SDK가 생성한 오디오 엘리먼트 찾기 (src가 없거나 blob URL)
            if (!element.src || element.src.startsWith("blob:")) {
              audioElement = element;
              break;
            }
          }

          // setSinkId를 사용하여 오디오 출력 장치 변경 시도
          if (audioElement && "setSinkId" in audioElement) {
            try {
              // 오디오 출력 장치 목록 가져오기
              const devices = await (
                navigator.mediaDevices as any
              ).enumerateDevices();
              const audioOutputDevices = devices.filter(
                (device: MediaDeviceInfo) => device.kind === "audiooutput",
              );

              if (audioOutputDevices.length > 0) {
                let targetDeviceId: string | null = null;

                if (newSpeakerState) {
                  // 스피커폰 켜기: 스피커 장치 찾기
                  const speakerDevice = audioOutputDevices.find(
                    (device: MediaDeviceInfo) =>
                      device.deviceId === "default" ||
                      device.label.toLowerCase().includes("speaker") ||
                      device.label.toLowerCase().includes("스피커"),
                  );
                  targetDeviceId =
                    speakerDevice?.deviceId ||
                    audioOutputDevices[0]?.deviceId ||
                    "default";
                } else {
                  // 스피커폰 끄기: 이어폰/헤드폰 장치 찾기
                  const earpieceDevice = audioOutputDevices.find(
                    (device: MediaDeviceInfo) =>
                      device.label.toLowerCase().includes("earpiece") ||
                      device.label.toLowerCase().includes("headphone") ||
                      device.label.toLowerCase().includes("이어폰") ||
                      device.label.toLowerCase().includes("헤드폰"),
                  );
                  targetDeviceId =
                    earpieceDevice?.deviceId ||
                    audioOutputDevices[0]?.deviceId ||
                    "default";
                }

                // setSinkId로 오디오 출력 장치 변경
                await (audioElement as any).setSinkId(targetDeviceId);
                if (import.meta.env.DEV) {
                  logger.log(
                    `오디오 출력 장치 변경 (setSinkId): ${targetDeviceId}`,
                  );
                }
              }
            } catch (sinkError) {
              // setSinkId가 지원되지 않거나 실패한 경우 무시 (볼륨은 이미 설정됨)
              if (import.meta.env.DEV) {
                logger.log("setSinkId 미지원 또는 실패 (무시):", sinkError);
              }
            }
          }
        } catch (deviceError) {
          // 오디오 장치 API가 지원되지 않는 경우 볼륨만 조절
          if (import.meta.env.DEV) {
            logger.log("오디오 장치 API 미지원, 볼륨만 조절:", deviceError);
          }
          // 볼륨 설정 재시도
          try {
            await this.callState.remoteAudioTrack.setVolume(speakerVolume);
          } catch (volumeError) {
            logger.error("볼륨 설정 실패:", volumeError);
          }
        }
      } else {
        if (import.meta.env.DEV) {
          logger.log("리모트 오디오 트랙이 없어 볼륨을 설정할 수 없음");
        }
      }

      // 로컬 마이크 게인 조절 (내 목소리)
      if (this.callState.localAudioTrack) {
        try {
          // MediaStreamTrack의 setConstraints를 사용하여 마이크 게인 조절 시도
          const track = this.callState.localAudioTrack.getMediaStreamTrack();

          if (track && "getCapabilities" in track) {
            const capabilities = (track as any).getCapabilities();

            // 마이크 게인 조절 (스피커폰 ON일 때 더 크게)
            // volume 속성이 있는지 확인 (일부 브라우저에서만 지원)
            if (capabilities && "volume" in capabilities) {
              try {
                // 스피커폰 ON: 마이크 게인 증가 (1.0-2.0 범위)
                // 스피커폰 OFF: 마이크 게인 정상 (1.0)
                const volumeConstraint = newSpeakerState ? 1.5 : 1.0;

                await track.applyConstraints({
                  volume: volumeConstraint,
                } as any);

                if (import.meta.env.DEV) {
                  logger.log(`마이크 게인 조절: ${volumeConstraint}`);
                }
              } catch (constraintError) {
                // applyConstraints 실패는 무시 (모든 브라우저에서 지원되지 않을 수 있음)
                if (import.meta.env.DEV) {
                  logger.log("마이크 게인 조절 실패 (무시):", constraintError);
                }
              }
            } else {
              // volume 속성이 없는 경우, Agora SDK의 setVolume으로 대체 시도
              // 주의: setVolume은 마이크 게인이 아니라 트랙 레벨을 조절합니다
              // 하지만 어느 정도 효과가 있을 수 있습니다
              const trackVolume = newSpeakerState ? 150 : 100;

              try {
                // IMicrophoneAudioTrack의 setVolume은 트랙 레벨을 조절
                // 실제 마이크 게인은 브라우저/OS 레벨에서 제어되어 제한적입니다
                await (this.callState.localAudioTrack as any).setVolume?.(
                  trackVolume,
                );

                if (import.meta.env.DEV) {
                  logger.log(`마이크 트랙 레벨 조절: ${trackVolume}%`);
                }
              } catch (volumeError) {
                // setVolume 실패는 무시
                if (import.meta.env.DEV) {
                  logger.log(
                    "마이크 트랙 레벨 조절 실패 (무시):",
                    volumeError,
                  );
                }
              }
            }
          }
        } catch (micError) {
          // 마이크 게인 조절 실패는 무시 (모든 브라우저에서 지원되지 않을 수 있음)
          if (import.meta.env.DEV) {
            logger.log("마이크 게인 조절 실패 (무시):", micError);
          }
        }
      }

      this.callState.isSpeakerOn = newSpeakerState;
      this.callState.volume = speakerVolume;

      if (import.meta.env.DEV) {
        logger.log(
          `스피커폰 ${newSpeakerState ? "켜짐" : "꺼짐"} - 볼륨: ${speakerVolume}%`,
        );
      }

      return newSpeakerState;
    } catch (error) {
      logger.error("스피커폰 토글 실패:", error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 음량 설정
   */
  async setVolume(volume: number): Promise<void> {
    try {
      if (volume < 0 || volume > 100) {
        throw new Error("음량은 0-100 사이의 값이어야 합니다.");
      }

      this.callState.volume = volume;

      // 리모트 오디오 트랙이 있으면 음량 조절
      if (this.callState.remoteAudioTrack) {
        await this.callState.remoteAudioTrack.setVolume(volume);
      }

      if (import.meta.env.DEV) {
        logger.log(`음량 설정: ${volume}%`);
      }
    } catch (error) {
      logger.error("음량 설정 실패:", error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 로컬 오디오 트랙 생성
   */
  private async createLocalAudioTrack(): Promise<void> {
    try {
      if (import.meta.env.DEV) {
        logger.log("마이크 권한 요청 중...");
      }

      this.callState.localAudioTrack =
        await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "music_standard", // 음성 통화에 최적화된 설정
          AEC: true, // 에코 제거
          ANS: true, // 노이즈 제거
          AGC: true, // 자동 게인 제어
        });

      // 성공 시 재시도 카운터 초기화
      this.microphoneRetryCount = 0;

      if (import.meta.env.DEV) {
        logger.log("로컬 오디오 트랙 생성 성공");
      }
    } catch (error) {
      logger.error("로컬 오디오 트랙 생성 실패:", error);

      // 마이크 권한 거부 에러 체크
      if (
        error instanceof Error &&
        (error.message.includes("Permission denied") ||
          error.message.includes("NotAllowedError") ||
          error.message.includes("PERMISSION_DENIED"))
      ) {
        logger.error("❌ 마이크 권한이 거부되었습니다");
        this.callbacks.onMicrophonePermissionDenied?.();

        // 재시도 로직
        if (this.microphoneRetryCount < this.MAX_MICROPHONE_RETRY) {
          this.microphoneRetryCount++;
          logger.warn(
            `⚠️ 마이크 권한 재시도 중... (${this.microphoneRetryCount}/${this.MAX_MICROPHONE_RETRY})`,
          );

          // 3초 대기 후 재시도
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return this.createLocalAudioTrack();
        }
      }

      throw error;
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // 연결 상태 변경
    this.client.on("connection-state-change", (curState, revState, reason) => {
      if (import.meta.env.DEV) {
        logger.log("🔗 Agora 연결 상태 변경:", { curState, revState, reason });
      }
      this.callState.connectionState = curState;
      this.callbacks.onConnectionStateChange?.(curState);

      if (curState === "CONNECTED") {
        if (import.meta.env.DEV) {
          logger.log("✅ Agora 채널 연결 성공");
        }
      }

      // 연결 해제 시 처리
      if (curState === "DISCONNECTED") {
        this.callState.isConnected = false;
        if (reason === "LEAVE") {
          if (import.meta.env.DEV) {
            logger.log("🚪 사용자가 채널을 떠남");
          }
          // 정상 퇴장 시 재연결 카운터 초기화
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
        } else {
          logger.error("❌ 연결이 예상치 못하게 끊어짐:", reason);
          if (import.meta.env.DEV) {
            logger.error("❌ 연결 끊어짐 상세 정보:", {
              curState,
              revState,
              reason,
            });
          }

          // 자동 재연결 시도
          this.handleUnexpectedDisconnection(reason);
        }
      }
    });

    // 사용자 입장
    this.client.on("user-joined", (user) => {
      if (import.meta.env.DEV) {
        logger.log("사용자 입장:", user.uid);
      }
      this.callbacks.onUserJoined?.(user.uid.toString());
    });

    // 사용자 퇴장
    this.client.on("user-left", (user, reason) => {
      if (import.meta.env.DEV) {
        logger.log("사용자 퇴장:", user.uid, reason);
      }
      this.callbacks.onUserLeft?.(user.uid.toString());
    });

    // 오디오 트랙 구독
    this.client.on("user-published", async (user, mediaType) => {
      if (import.meta.env.DEV) {
        logger.log(
          "👤 사용자 오디오 트랙 발행:",
          user.uid,
          "타입:",
          mediaType,
        );
      }

      if (mediaType === "audio") {
        if (import.meta.env.DEV) {
          logger.log("🔊 오디오 트랙 구독 시작...");
        }
        await this.client!.subscribe(user, mediaType);
        if (import.meta.env.DEV) {
          logger.log("✅ 오디오 트랙 구독 완료");
        }

        // 구독한 오디오 트랙 자동 재생
        const remoteAudioTrack = user.audioTrack;
        if (remoteAudioTrack) {
          if (import.meta.env.DEV) {
            logger.log("🔊 원격 오디오 트랙 재생 시작...");
          }
          remoteAudioTrack.play();
          if (import.meta.env.DEV) {
            logger.log("✅ 원격 오디오 트랙 재생 성공");
          }

          // 활동 시간 갱신 (오디오 트랙 수신)
          this.updateActivity();
        }
      }
    });

    // 오디오 트랙 구독 성공
    this.client.on("user-unpublished", (user, mediaType) => {
      if (import.meta.env.DEV) {
        logger.log("사용자 오디오 트랙 구독 해제:", user.uid);
      }

      if (mediaType === "audio") {
        this.callbacks.onAudioTrackUnsubscribed?.(user.uid.toString());
      }
    });

    // 구독한 오디오 트랙
    this.client.on("user-audio-track-subscribed", (user, audioTrack) => {
      if (import.meta.env.DEV) {
        logger.log("오디오 트랙 구독 성공:", user.uid);
      }
      this.callState.remoteAudioTrack = audioTrack;
      this.callbacks.onAudioTrackSubscribed?.(user.uid.toString(), audioTrack);

      // 리모트 오디오 트랙 구독 시 현재 스피커폰 상태에 맞는 초기 볼륨 설정
      // 통화 시작 시 스피커폰은 OFF 상태이므로 40%로 설정
      try {
        const initialVolume = this.callState.isSpeakerOn ? 100 : 40;
        audioTrack.setVolume(initialVolume);
        this.callState.volume = initialVolume;
        if (import.meta.env.DEV) {
          logger.log(
            `리모트 오디오 트랙 초기 볼륨 설정: ${initialVolume}% (스피커폰: ${this.callState.isSpeakerOn ? "ON" : "OFF"})`,
          );
        }

        // 볼륨이 제대로 설정되었는지 확인하기 위해 약간의 지연 후 다시 설정
        setTimeout(() => {
          try {
            audioTrack.setVolume(initialVolume);
            if (import.meta.env.DEV) {
              logger.log(
                `리모트 오디오 트랙 볼륨 재설정 (확인): ${initialVolume}%`,
              );
            }
          } catch (retryError) {
            if (import.meta.env.DEV) {
              logger.log(
                "리모트 오디오 트랙 볼륨 재설정 실패 (무시):",
                retryError,
              );
            }
          }
        }, 100);
      } catch (error) {
        if (import.meta.env.DEV) {
          logger.log("리모트 오디오 트랙 초기 볼륨 설정 실패 (무시):", error);
        }
      }

      // 활동 시간 갱신
      this.updateActivity();
    });

    // 토큰 만료 30초 전 알림 (토큰 갱신 시도)
    this.client.on("token-privilege-will-expire", () => {
      logger.warn("⚠️ Agora RTC 토큰이 30초 후 만료됩니다 - 갱신 필요");

      if (this.isRenewingToken) {
        if (import.meta.env.DEV) {
          logger.log("이미 토큰 갱신 중 - 중복 요청 무시");
        }
        return;
      }

      this.isRenewingToken = true;
      this.callbacks.onTokenPrivilegeWillExpire?.();
    });

    // 토큰 만료됨 (긴급 상황)
    this.client.on("token-privilege-did-expire", () => {
      logger.error("❌ Agora RTC 토큰이 만료되었습니다 - 통화 종료 필요");
      this.callbacks.onTokenPrivilegeDidExpire?.();
    });

    // 네트워크 품질 모니터링 (2초마다 업데이트)
    this.client.on("network-quality", (stats) => {
      const quality: NetworkQualityState = {
        uplinkNetworkQuality: stats.uplinkNetworkQuality as NetworkQuality,
        downlinkNetworkQuality: stats.downlinkNetworkQuality as NetworkQuality,
      };

      // 연결 유지 중이면 '활동'으로 간주 (5분 무응답 자동종료 타이머 리셋)
      this.updateActivity();

      // 상태 업데이트
      this.callState.networkQuality = quality;

      // 네트워크 품질이 나쁠 때만 로그 출력 (개발 환경)
      if (import.meta.env.DEV) {
        if (
          stats.uplinkNetworkQuality >= 4 ||
          stats.downlinkNetworkQuality >= 4
        ) {
          logger.warn("⚠️ 네트워크 품질 저하:", {
            uplink: this.getNetworkQualityLabel(
              stats.uplinkNetworkQuality as NetworkQuality,
            ),
            downlink: this.getNetworkQualityLabel(
              stats.downlinkNetworkQuality as NetworkQuality,
            ),
          });
        }
      }

      // 콜백 호출
      this.callbacks.onNetworkQualityChange?.(quality);
    });

    // SDK 내부 예외 감지
    this.client.on("exception", (event: any) => {
      logger.error("⚠️ Agora SDK 예외 발생:", event);

      if (import.meta.env.DEV) {
        logger.error("예외 상세:", {
          code: event.code,
          msg: event.msg,
          uid: event.uid,
        });
      }

      const eventCode = String(event.code || "");

      // 비디오 관련 에러는 무시 (음성 통화만 사용)
      if (
        eventCode === "FRAMERATE_INPUT_TOO_LOW" ||
        eventCode === "FRAMERATE_SENT_TOO_LOW" ||
        eventCode === "SEND_VIDEO_BITRATE_TOO_LOW" ||
        eventCode === "RECV_VIDEO_DECODE_FAILED"
      ) {
        return;
      }

      // 기타 예외는 콜백으로 전달
      this.callbacks.onException?.({
        code: eventCode,
        msg: String(event.msg || ""),
        uid: String(event.uid || "unknown"),
      });
    });
  }

  /**
   * 네트워크 품질을 한글 레이블로 변환
   */
  private getNetworkQualityLabel(quality: NetworkQuality): string {
    const labels = {
      0: "측정중",
      1: "최고",
      2: "좋음",
      3: "보통",
      4: "나쁨",
      5: "매우나쁨",
      6: "연결끊김",
    };
    return labels[quality];
  }

  /**
   * 예상치 못한 연결 해제 처리 (자동 재연결 시도)
   */
  private async handleUnexpectedDisconnection(
    reason: ConnectionDisconnectedReason,
  ): Promise<void> {
    // 이미 재연결 중이면 무시
    if (this.isReconnecting) {
      if (import.meta.env.DEV) {
        logger.log("⚠️ 이미 재연결 시도 중");
      }
      return;
    }

    // 최대 재연결 시도 횟수 초과
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        `❌ 최대 재연결 시도 횟수(${this.MAX_RECONNECT_ATTEMPTS})를 초과했습니다`,
      );
      this.callbacks.onError?.(
        new Error(
          "네트워크 연결이 불안정하여 통화가 종료되었습니다. 다시 시도해주세요.",
        ),
      );
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    logger.warn(
      `🔄 재연결 시도 중... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`,
    );

    try {
      // 잠시 대기 (네트워크 안정화)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 현재 채널 정보가 있으면 재연결 시도
      if (this.currentChannelInfo && this.client) {
        if (import.meta.env.DEV) {
          logger.log("🔄 Agora 채널 재입장 시도");
        }

        // 재입장 시도 (UID는 숫자로 전달)
        const reconnectUid =
          typeof this.currentChannelInfo.uid === "number"
            ? this.currentChannelInfo.uid
            : Number(this.currentChannelInfo.uid);
        await this.client.join(
          this.currentChannelInfo.appId,
          this.currentChannelInfo.channelName,
          this.currentChannelInfo.token,
          Number.isNaN(reconnectUid)
            ? this.currentChannelInfo.uid
            : reconnectUid,
        );

        // 오디오 트랙 다시 발행
        if (this.callState.localAudioTrack) {
          await this.client.publish([this.callState.localAudioTrack]);
        }

        this.callState.isConnected = true;
        this.isReconnecting = false;

        // 재연결 성공 - 카운터는 유지 (완전히 안정화될 때까지)
        logger.log("✅ 재연결 성공");
      }
    } catch (error) {
      logger.error("❌ 재연결 실패:", error);
      this.isReconnecting = false;

      // 재시도 가능하면 다시 시도
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        logger.warn("⏰ 3초 후 재연결 재시도...");
        setTimeout(() => {
          this.handleUnexpectedDisconnection(reason);
        }, 3000);
      } else {
        this.callbacks.onError?.(
          new Error(
            "네트워크 연결에 실패했습니다. 통화를 종료하고 다시 시도해주세요.",
          ),
        );
      }
    }
  }

  /**
   * 통화 통계 수집
   * 통화 종료 시 호출하여 통계 정보를 가져옴
   */
  async getCallStatistics(): Promise<CallStatistics | null> {
    try {
      if (!this.client) {
        logger.warn("⚠️ Agora 클라이언트가 없어 통계 수집 불가");
        return null;
      }

      if (import.meta.env.DEV) {
        logger.log("📊 통화 통계 수집 시작");
      }

      // Agora SDK에서 RTC 통계 가져오기
      const rtcStats = await this.client.getRTCStats();

      // 로컬 오디오 트랙 통계
      let localAudioStats = null;
      if (this.callState.localAudioTrack) {
        try {
          localAudioStats = this.callState.localAudioTrack.getStats();
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.log("⚠️ 로컬 오디오 통계 수집 실패:", error);
          }
        }
      }

      // 리모트 오디오 트랙 통계
      let remoteAudioStats = null;
      if (this.callState.remoteAudioTrack) {
        try {
          remoteAudioStats = this.callState.remoteAudioTrack.getStats();
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.log("⚠️ 리모트 오디오 통계 수집 실패:", error);
          }
        }
      }

      const statistics: CallStatistics = {
        // 기본 정보
        duration: rtcStats.Duration || 0,

        // 네트워크 통계 (전체)
        sendBytes: rtcStats.SendBytes,
        receiveBytes: rtcStats.RecvBytes,
        sendBitrate: rtcStats.SendBitrate,
        receiveBitrate: rtcStats.RecvBitrate,

        // 오디오 통계
        audioSendBytes: localAudioStats?.sendBytes,
        audioReceiveBytes: remoteAudioStats?.receiveBytes,
        audioSendBitrate: localAudioStats?.sendBitrate,
        audioReceiveBitrate: remoteAudioStats?.receiveBitrate,

        // 패킷 손실
        sendPacketsLost: localAudioStats?.sendPacketsLost,
        receivePacketsLost: remoteAudioStats?.receivePacketsLost,

        // 기타
        userCount: rtcStats.UserCount,
        lastNetworkQuality: { ...this.callState.networkQuality },
      };

      if (import.meta.env.DEV) {
        logger.log("✅ 통화 통계 수집 완료:", {
          duration: `${statistics.duration}초`,
          sendBytes: `${Math.round((statistics.sendBytes || 0) / 1024)}KB`,
          receiveBytes: `${Math.round((statistics.receiveBytes || 0) / 1024)}KB`,
          networkQuality: {
            uplink: this.getNetworkQualityLabel(
              statistics.lastNetworkQuality?.uplinkNetworkQuality || 0,
            ),
            downlink: this.getNetworkQualityLabel(
              statistics.lastNetworkQuality?.downlinkNetworkQuality || 0,
            ),
          },
        });
      }

      return statistics;
    } catch (error) {
      logger.error("❌ 통화 통계 수집 실패:", error);
      return null;
    }
  }

  /**
   * 토큰 갱신
   * @param newToken 새로운 RTC 토큰
   */
  async renewToken(newToken: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error("Agora 클라이언트가 초기화되지 않았습니다.");
      }

      if (import.meta.env.DEV) {
        logger.log("🔄 Agora RTC 토큰 갱신 시작");
      }

      // Agora SDK의 renewToken 메서드 호출
      await this.client.renewToken(newToken);

      // 현재 채널 정보 업데이트
      if (this.currentChannelInfo) {
        this.currentChannelInfo.token = newToken;
      }

      this.isRenewingToken = false;

      if (import.meta.env.DEV) {
        logger.log("✅ Agora RTC 토큰 갱신 완료");
      }
    } catch (error) {
      this.isRenewingToken = false;
      logger.error("❌ Agora RTC 토큰 갱신 실패:", error);
      throw error;
    }
  }

  /**
   * 현재 채널 정보 반환
   */
  getCurrentChannelInfo(): AgoraChannelInfo | null {
    return this.currentChannelInfo ? { ...this.currentChannelInfo } : null;
  }

  /**
   * 서비스 정리
   */
  async destroy(): Promise<void> {
    try {
      await this.leaveChannel();
      this.callbacks = {};
    } catch (error) {
      logger.error("Agora 서비스 정리 실패:", error);
    }
  }
}

// 싱글톤 인스턴스
let agoraServiceInstance: AgoraService | null = null;

export const getAgoraService = (): AgoraService => {
  if (!agoraServiceInstance) {
    agoraServiceInstance = new AgoraService();
  }
  return agoraServiceInstance;
};
