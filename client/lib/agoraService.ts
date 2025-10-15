import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  ConnectionState,
  ConnectionDisconnectedReason,
} from "agora-rtc-sdk-ng";

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
}

/**
 * Agora 채널 정보
 */
export interface AgoraChannelInfo {
  appId: string;
  channelName: string;
  token: string;
  uid: string;
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
    isSpeakerOn: true,
    localAudioTrack: null,
    remoteAudioTrack: null,
    volume: 100,
    connectionState: "DISCONNECTED",
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
        console.log("⚠️ Agora 로그 업로드 비활성화 실패:", error);
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
        console.log("⚠️ 이미 입장 중 - 중복 요청 무시");
      }
      return;
    }

    try {
      this.isJoining = true;

      // 개발 환경에서만 상세 로그 출력 (보안상 프로덕션에서는 민감 정보 숨김)
      if (import.meta.env.DEV) {
        console.log("🎯 Agora 채널 입장 시도");
        console.log("📋 채널 정보 상세:", {
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
          console.log(
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
          console.log("⚠️ 기존 클라이언트가 아직 존재 - 강제 정리");
        }
        this.client = null;
      }

      if (import.meta.env.DEV) {
        console.log("🔧 Agora 클라이언트 생성 중...");
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
            console.log("🔧 Agora 클라이언트 추가 설정 적용");
          }
        }
      } catch (error) {
        // 에러 무시 (SDK 버전에 따라 지원하지 않을 수 있음)
        if (import.meta.env.DEV) {
          console.log("⚠️ Agora 클라이언트 추가 설정 실패:", error);
        }
      }

      // 이벤트 리스너 설정
      if (import.meta.env.DEV) {
        console.log("📡 이벤트 리스너 설정 중...");
      }
      this.setupEventListeners();

      // 마이크 권한 요청 및 오디오 트랙 생성
      if (import.meta.env.DEV) {
        console.log("🎤 마이크 권한 요청 및 오디오 트랙 생성 중...");
      }
      await this.createLocalAudioTrack();

      // 채널에 입장
      if (import.meta.env.DEV) {
        console.log("🚪 Agora 채널에 입장 중...");
      }
      await this.client.join(
        channelInfo.appId,
        channelInfo.channelName,
        channelInfo.token,
        channelInfo.uid,
      );

      if (import.meta.env.DEV) {
        console.log("✅ Agora 채널 입장 성공");
      }

      // 로컬 오디오 트랙을 채널에 발행 (publish)
      if (import.meta.env.DEV) {
        console.log("📢 로컬 오디오 트랙을 채널에 발행 중...");
      }
      if (this.callState.localAudioTrack) {
        await this.client.publish([this.callState.localAudioTrack]);
        if (import.meta.env.DEV) {
          console.log("✅ 로컬 오디오 트랙 발행 성공");
        }
      } else {
        console.error("❌ 로컬 오디오 트랙이 없어서 발행할 수 없음");
      }

      this.callState.isConnected = true;
      this.callState.isConnecting = false;

      if (import.meta.env.DEV) {
        console.log("🔔 onCallStarted 콜백 호출 중...");
      }
      this.callbacks.onCallStarted?.();
      if (import.meta.env.DEV) {
        console.log("✅ onCallStarted 콜백 호출 완료");
      }

      // 무응답 감지 타이머 시작
      this.startInactivityTimer();
      if (import.meta.env.DEV) {
        console.log("⏰ 무응답 감지 타이머 시작 (5분)");
      }

      // 입장 완료 - 플래그 해제
      this.isJoining = false;
    } catch (error) {
      console.error("❌ Agora 채널 입장 실패:", error);
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
        console.log("🔄 강제 채널 퇴장 시작");
      }

      // 1. 로컬 오디오 트랙 정리
      if (this.callState.localAudioTrack) {
        try {
          if (this.client) {
            await this.client.unpublish([this.callState.localAudioTrack]);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.log("⚠️ unpublish 에러 무시:", error);
          }
        }

        try {
          this.callState.localAudioTrack.stop();
          this.callState.localAudioTrack.close();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.log("⚠️ 오디오 트랙 정리 에러 무시:", error);
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
            console.log("✅ 클라이언트 퇴장 성공");
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.log("⚠️ 클라이언트 퇴장 에러 무시:", error);
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
        console.log("✅ 강제 채널 퇴장 완료");
      }
    } catch (error) {
      console.error("❌ 강제 채널 퇴장 실패:", error);
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
        console.warn("⚠️ 5분간 활동이 없어 통화를 자동 종료합니다 (비용 방어)");
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
   * 활동 시간 갱신 (오디오 트랙 수신 등)
   */
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * 무응답 타임아웃 처리
   */
  private async handleInactivityTimeout(): Promise<void> {
    try {
      console.warn("🚨 무응답 타임아웃 - 통화 자동 종료");

      // 에러 콜백 호출
      this.callbacks.onError?.(
        new Error("장시간 활동이 없어 통화가 자동 종료되었습니다."),
      );

      // 채널에서 퇴장
      await this.leaveChannel();
    } catch (error) {
      console.error("무응답 타임아웃 처리 실패:", error);
    }
  }

  /**
   * 채널에서 퇴장
   */
  async leaveChannel(): Promise<void> {
    try {
      if (import.meta.env.DEV) {
        console.log("Agora 채널 퇴장");
      }

      // 무응답 감지 타이머 정지
      this.stopInactivityTimer();

      // 로컬 오디오 트랙 발행 해제 및 해제
      if (this.callState.localAudioTrack && this.client) {
        if (import.meta.env.DEV) {
          console.log("📢 로컬 오디오 트랙 발행 해제 중...");
        }
        try {
          await this.client.unpublish([this.callState.localAudioTrack]);
          if (import.meta.env.DEV) {
            console.log("✅ 로컬 오디오 트랙 발행 해제 완료");
          }
        } catch (error) {
          console.error("❌ 로컬 오디오 트랙 발행 해제 실패:", error);
        }

        this.callState.localAudioTrack.stop();
        this.callState.localAudioTrack.close();
        this.callState.localAudioTrack = null;
      }

      // 리모트 오디오 트랙 해제
      if (this.callState.remoteAudioTrack) {
        this.callState.remoteAudioTrack.stop();
        this.callState.remoteAudioTrack = null;
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
          console.error("❌ 클라이언트 퇴장 실패:", error);
        }
        this.client = null;
      }

      // 상태 초기화
      this.callState = {
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isSpeakerOn: true,
        localAudioTrack: null,
        remoteAudioTrack: null,
        volume: 100,
        connectionState: "DISCONNECTED",
      };
      this.isJoining = false;

      this.currentChannelInfo = null;
      this.callbacks.onCallEnded?.();

      if (import.meta.env.DEV) {
        console.log("Agora 채널 퇴장 완료");
      }
    } catch (error) {
      console.error("Agora 채널 퇴장 실패:", error);
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
        console.log(`마이크 ${newMutedState ? "음소거" : "해제"}`);
      }

      return newMutedState;
    } catch (error) {
      console.error("마이크 토글 실패:", error);
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
        console.log(`마이크 ${muted ? "음소거" : "해제"}`);
      }
    } catch (error) {
      console.error("마이크 상태 설정 실패:", error);
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

      // 리모트 오디오 트랙이 있으면 음량 조절
      if (this.callState.remoteAudioTrack) {
        await this.callState.remoteAudioTrack.setVolume(
          newSpeakerState ? 100 : 0,
        );
      }

      this.callState.isSpeakerOn = newSpeakerState;
      if (import.meta.env.DEV) {
        console.log(`스피커폰 ${newSpeakerState ? "켜짐" : "꺼짐"}`);
      }

      return newSpeakerState;
    } catch (error) {
      console.error("스피커폰 토글 실패:", error);
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
        console.log(`음량 설정: ${volume}%`);
      }
    } catch (error) {
      console.error("음량 설정 실패:", error);
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
        console.log("마이크 권한 요청 중...");
      }

      this.callState.localAudioTrack =
        await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "music_standard", // 음성 통화에 최적화된 설정
          AEC: true, // 에코 제거
          ANS: true, // 노이즈 제거
          AGC: true, // 자동 게인 제어
        });

      if (import.meta.env.DEV) {
        console.log("로컬 오디오 트랙 생성 성공");
      }
    } catch (error) {
      console.error("로컬 오디오 트랙 생성 실패:", error);
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
        console.log("🔗 Agora 연결 상태 변경:", { curState, revState, reason });
      }
      this.callState.connectionState = curState;
      this.callbacks.onConnectionStateChange?.(curState);

      if (curState === "CONNECTED") {
        if (import.meta.env.DEV) {
          console.log("✅ Agora 채널 연결 성공");
        }
      }

      // 연결 해제 시 처리
      if (curState === "DISCONNECTED") {
        this.callState.isConnected = false;
        if (reason === "LEAVE") {
          if (import.meta.env.DEV) {
            console.log("🚪 사용자가 채널을 떠남");
          }
        } else {
          console.error("❌ 연결이 예상치 못하게 끊어짐:", reason);
          if (import.meta.env.DEV) {
            console.error("❌ 연결 끊어짐 상세 정보:", {
              curState,
              revState,
              reason,
            });
          }
          this.callbacks.onError?.(new Error("네트워크 연결이 불안정합니다."));
        }
      }
    });

    // 사용자 입장
    this.client.on("user-joined", (user) => {
      if (import.meta.env.DEV) {
        console.log("사용자 입장:", user.uid);
      }
      this.callbacks.onUserJoined?.(user.uid.toString());
    });

    // 사용자 퇴장
    this.client.on("user-left", (user, reason) => {
      if (import.meta.env.DEV) {
        console.log("사용자 퇴장:", user.uid, reason);
      }
      this.callbacks.onUserLeft?.(user.uid.toString());
    });

    // 오디오 트랙 구독
    this.client.on("user-published", async (user, mediaType) => {
      if (import.meta.env.DEV) {
        console.log(
          "👤 사용자 오디오 트랙 발행:",
          user.uid,
          "타입:",
          mediaType,
        );
      }

      if (mediaType === "audio") {
        if (import.meta.env.DEV) {
          console.log("🔊 오디오 트랙 구독 시작...");
        }
        await this.client!.subscribe(user, mediaType);
        if (import.meta.env.DEV) {
          console.log("✅ 오디오 트랙 구독 완료");
        }

        // 구독한 오디오 트랙 자동 재생
        const remoteAudioTrack = user.audioTrack;
        if (remoteAudioTrack) {
          if (import.meta.env.DEV) {
            console.log("🔊 원격 오디오 트랙 재생 시작...");
          }
          remoteAudioTrack.play();
          if (import.meta.env.DEV) {
            console.log("✅ 원격 오디오 트랙 재생 성공");
          }

          // 활동 시간 갱신 (오디오 트랙 수신)
          this.updateActivity();
        }
      }
    });

    // 오디오 트랙 구독 성공
    this.client.on("user-unpublished", (user, mediaType) => {
      if (import.meta.env.DEV) {
        console.log("사용자 오디오 트랙 구독 해제:", user.uid);
      }

      if (mediaType === "audio") {
        this.callbacks.onAudioTrackUnsubscribed?.(user.uid.toString());
      }
    });

    // 구독한 오디오 트랙
    this.client.on("user-audio-track-subscribed", (user, audioTrack) => {
      if (import.meta.env.DEV) {
        console.log("오디오 트랙 구독 성공:", user.uid);
      }
      this.callState.remoteAudioTrack = audioTrack;
      this.callbacks.onAudioTrackSubscribed?.(user.uid.toString(), audioTrack);

      // 활동 시간 갱신
      this.updateActivity();
    });

    // 토큰 만료 30초 전 알림 (토큰 갱신 시도)
    this.client.on("token-privilege-will-expire", () => {
      console.warn("⚠️ Agora RTC 토큰이 30초 후 만료됩니다 - 갱신 필요");

      if (this.isRenewingToken) {
        if (import.meta.env.DEV) {
          console.log("이미 토큰 갱신 중 - 중복 요청 무시");
        }
        return;
      }

      this.isRenewingToken = true;
      this.callbacks.onTokenPrivilegeWillExpire?.();
    });

    // 토큰 만료됨 (긴급 상황)
    this.client.on("token-privilege-did-expire", () => {
      console.error("❌ Agora RTC 토큰이 만료되었습니다 - 통화 종료 필요");
      this.callbacks.onTokenPrivilegeDidExpire?.();
    });
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
        console.log("🔄 Agora RTC 토큰 갱신 시작");
      }

      // Agora SDK의 renewToken 메서드 호출
      await this.client.renewToken(newToken);

      // 현재 채널 정보 업데이트
      if (this.currentChannelInfo) {
        this.currentChannelInfo.token = newToken;
      }

      this.isRenewingToken = false;

      if (import.meta.env.DEV) {
        console.log("✅ Agora RTC 토큰 갱신 완료");
      }
    } catch (error) {
      this.isRenewingToken = false;
      console.error("❌ Agora RTC 토큰 갱신 실패:", error);
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
      console.error("Agora 서비스 정리 실패:", error);
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
