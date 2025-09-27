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

  constructor() {
    // Agora SDK 초기화
    AgoraRTC.setLogLevel(4); // INFO 레벨로 설정
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
    try {
      console.log("Agora 채널 입장 시도:", channelInfo);

      this.callState.isConnecting = true;
      this.currentChannelInfo = channelInfo;

      // 클라이언트 생성
      this.client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      });

      // 이벤트 리스너 설정
      this.setupEventListeners();

      // 마이크 권한 요청 및 오디오 트랙 생성
      await this.createLocalAudioTrack();

      // 채널에 입장
      await this.client.join(
        channelInfo.appId,
        channelInfo.channelName,
        channelInfo.token,
        channelInfo.uid,
      );

      console.log("Agora 채널 입장 성공");
      this.callState.isConnected = true;
      this.callState.isConnecting = false;
      this.callbacks.onCallStarted?.();
    } catch (error) {
      console.error("Agora 채널 입장 실패:", error);
      this.callState.isConnecting = false;
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 채널에서 퇴장
   */
  async leaveChannel(): Promise<void> {
    try {
      console.log("Agora 채널 퇴장");

      // 로컬 오디오 트랙 해제
      if (this.callState.localAudioTrack) {
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
        await this.client.leave();
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

      this.currentChannelInfo = null;
      this.callbacks.onCallEnded?.();

      console.log("Agora 채널 퇴장 완료");
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
      console.log(`마이크 ${newMutedState ? "음소거" : "해제"}`);

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
      console.log(`마이크 ${muted ? "음소거" : "해제"}`);
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
      console.log(`스피커폰 ${newSpeakerState ? "켜짐" : "꺼짐"}`);

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

      console.log(`음량 설정: ${volume}%`);
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
      console.log("마이크 권한 요청 중...");

      this.callState.localAudioTrack =
        await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "music_standard", // 음성 통화에 최적화된 설정
          AEC: true, // 에코 제거
          ANS: true, // 노이즈 제거
          AGC: true, // 자동 게인 제어
        });

      console.log("로컬 오디오 트랙 생성 성공");
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
      console.log("연결 상태 변경:", { curState, revState, reason });
      this.callState.connectionState = curState;
      this.callbacks.onConnectionStateChange?.(curState);

      // 연결 해제 시 처리
      if (curState === "DISCONNECTED") {
        this.callState.isConnected = false;
        if (reason === "LEAVE") {
          console.log("사용자가 채널을 떠남");
        } else {
          console.log("네트워크 연결 문제로 채널 연결 해제");
          this.callbacks.onError?.(new Error("네트워크 연결이 불안정합니다."));
        }
      }
    });

    // 사용자 입장
    this.client.on("user-joined", (user) => {
      console.log("사용자 입장:", user.uid);
      this.callbacks.onUserJoined?.(user.uid.toString());
    });

    // 사용자 퇴장
    this.client.on("user-left", (user, reason) => {
      console.log("사용자 퇴장:", user.uid, reason);
      this.callbacks.onUserLeft?.(user.uid.toString());
    });

    // 오디오 트랙 구독
    this.client.on("user-published", async (user, mediaType) => {
      console.log("사용자 오디오 트랙 발행:", user.uid);

      if (mediaType === "audio") {
        await this.client!.subscribe(user, mediaType);
      }
    });

    // 오디오 트랙 구독 성공
    this.client.on("user-unpublished", (user, mediaType) => {
      console.log("사용자 오디오 트랙 구독 해제:", user.uid);

      if (mediaType === "audio") {
        this.callbacks.onAudioTrackUnsubscribed?.(user.uid.toString());
      }
    });

    // 구독한 오디오 트랙
    this.client.on("user-audio-track-subscribed", (user, audioTrack) => {
      console.log("오디오 트랙 구독 성공:", user.uid);
      this.callState.remoteAudioTrack = audioTrack;
      this.callbacks.onAudioTrackSubscribed?.(user.uid.toString(), audioTrack);
    });
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
