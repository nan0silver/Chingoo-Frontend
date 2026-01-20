import { create } from "zustand";
import { CallStartNotification } from "@shared/api";
import { AgoraCallState } from "./agoraService";

/**
 * 통화 상태
 */
export interface CallState {
  // 통화 정보
  callId: string | null;
  matchingId: string | null;
  partner: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  } | null;

  // Agora 채널 정보
  agoraChannelInfo: {
    appId: string;
    channelName: string;
    token: string;
    uid: string;
  } | null;

  // 통화 상태
  isInCall: boolean;
  isConnecting: boolean;
  callStartTime: Date | null;

  // Agora 상태
  agoraState: AgoraCallState;

  // 에러 상태
  error: string | null;
}

/**
 * localStorage에 저장할 통화 정보 (직렬화 가능한 데이터만)
 * 백엔드 30초 유예 시간과 연동 (timestamp로 30초 체크)
 */
interface StoredCallInfo {
  callId: string;
  matchingId: string | null;
  partner: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  agoraChannelInfo: {
    appId: string;
    channelName: string;
    token: string;
    uid: string;
  };
  callStartTime: string; // ISO string
  categoryName: string | null; // 카테고리 이름
  timestamp: number; // Date.now() - 밀리초 단위 (30초 체크용)
}

/**
 * 통화 액션
 */
interface CallActions {
  // 통화 시작
  startCall: (notification: CallStartNotification) => void;

  // 통화 종료
  endCall: () => void;

  // 연결 상태 업데이트
  updateConnectingState: (isConnecting: boolean) => void;

  // Agora 상태 업데이트
  updateAgoraState: (agoraState: AgoraCallState) => void;

  // 에러 설정
  setError: (error: string | null) => void;

  // 상태 초기화
  reset: () => void;

  // partner 정보 삭제 (평가 완료 후)
  clearPartner: () => void;

  // localStorage에 통화 정보 저장 (Agora 채널 입장 성공 후 호출)
  saveCallToStorage: (categoryName?: string | null) => void;

  // localStorage에서 통화 정보 복원
  restoreCallFromStorage: () => StoredCallInfo | null;

  // localStorage에서 통화 정보 삭제
  clearCallFromStorage: () => void;
}

/**
 * 통화 스토어 타입
 */
export type CallStore = CallState & CallActions;

/**
 * 초기 상태
 */
const initialState: CallState = {
  callId: null,
  matchingId: null,
  partner: null,
  agoraChannelInfo: null,
  isInCall: false,
  isConnecting: false,
  callStartTime: null,
  agoraState: {
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    isSpeakerOn: true,
    localAudioTrack: null,
    remoteAudioTrack: null,
    volume: 100,
    connectionState: "DISCONNECTED",
    networkQuality: {
      uplinkNetworkQuality: 0,
      downlinkNetworkQuality: 0,
    },
  },
  error: null,
};

/**
 * localStorage 키 (백엔드 30초 유예 시간과 연동)
 */
const STORAGE_KEY = "active_call";

/**
 * 통화 스토어 생성
 */
export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  startCall: (notification: CallStartNotification) => {
    if (import.meta.env.DEV) {
      console.log("🏪 callStore.startCall 호출");
    }

    // 백엔드 데이터를 프론트엔드 형식으로 변환
    const partner = {
      id: String(notification.partnerId), // number를 string으로 변환
      nickname: notification.partnerNickname,
    };

    const agoraChannelInfo = {
      appId: import.meta.env.VITE_AGORA_APP_ID || "your-agora-app-id",
      channelName: notification.channelName,
      token: notification.rtcToken,
      uid: String(notification.agoraUid),
    };

    const callStartTime = new Date();

    set({
      callId: String(notification.callId), // number를 string으로 변환
      matchingId: notification.matchingId || null,
      partner: partner,
      agoraChannelInfo: agoraChannelInfo, // useCall에서 사용할 수 있도록 저장
      isInCall: true,
      callStartTime: callStartTime,
      error: null,
      // 통화 시작 시 스피커폰 상태를 OFF로 초기화
      agoraState: {
        isConnected: false,
        isConnecting: true,
        isMuted: false,
        isSpeakerOn: false, // 스피커폰 OFF
        localAudioTrack: null,
        remoteAudioTrack: null,
        volume: 40, // 작은 볼륨
        connectionState: "CONNECTING",
        networkQuality: {
          uplinkNetworkQuality: 0,
          downlinkNetworkQuality: 0,
        },
      },
    });

    // localStorage 저장은 Agora 채널 입장 성공 후에 수행 (onCallStarted 콜백에서)

    if (import.meta.env.DEV) {
      console.log("🏪 callStore 상태 업데이트 완료");
    }
  },

  endCall: () => {
    const currentState = get();
    if (import.meta.env.DEV) {
      console.log("🏪 [callStore.endCall] 통화 종료 호출됨");
      console.log("🏪 [callStore.endCall] 호출 전 상태:", {
        isInCall: currentState.isInCall,
        callId: currentState.callId,
        hasPartner: !!currentState.partner,
      });
    }

    // localStorage에서 통화 정보 삭제
    get().clearCallFromStorage();

    set({
      callId: currentState.callId, // 평가 페이지에서 사용하기 위해 일시적으로 보존
      matchingId: null,
      partner: currentState.partner, // 평가 페이지에서 사용하기 위해 일시적으로 보존
      agoraChannelInfo: null,
      isInCall: false,
      isConnecting: false,
      callStartTime: null,
      agoraState: {
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isSpeakerOn: true,
        localAudioTrack: null,
        remoteAudioTrack: null,
        volume: 100,
        connectionState: "DISCONNECTED",
        networkQuality: {
          uplinkNetworkQuality: 0,
          downlinkNetworkQuality: 0,
        },
      },
      error: null,
    });

    const newState = get();
    if (import.meta.env.DEV) {
      console.log("🏪 [callStore.endCall] 호출 후 상태:", {
        isInCall: newState.isInCall,
        callId: newState.callId,
        hasPartner: !!newState.partner,
      });
      console.log("🏪 [callStore.endCall] 통화 종료 완료");
    }
  },

  updateConnectingState: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  updateAgoraState: (agoraState: AgoraCallState) => {
    set({ agoraState });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    set(initialState);
  },

  clearPartner: () => {
    if (import.meta.env.DEV) {
      console.log("partner 정보 및 callId 삭제");
    }
    set({ partner: null, callId: null });
    // localStorage에서도 삭제
    get().clearCallFromStorage();
  },

  saveCallToStorage: (categoryName?: string | null) => {
    try {
      const state = get();
      if (
        !state.isInCall ||
        !state.callId ||
        !state.partner ||
        !state.agoraChannelInfo
      ) {
        // 저장할 정보가 없으면 삭제
        get().clearCallFromStorage();
        return;
      }

      // 카테고리 정보는 별도로 저장 (이미 저장된 경우 유지)
      const existing = get().restoreCallFromStorage();
      const categoryToSave =
        categoryName !== undefined
          ? categoryName
          : existing?.categoryName || null;

      const storedInfo: StoredCallInfo = {
        callId: state.callId,
        matchingId: state.matchingId,
        partner: state.partner,
        agoraChannelInfo: state.agoraChannelInfo,
        callStartTime:
          state.callStartTime?.toISOString() || new Date().toISOString(),
        categoryName: categoryToSave,
        timestamp: Date.now(), // 밀리초 단위 (30초 체크용)
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedInfo));
      if (import.meta.env.DEV) {
        console.log("💾 통화 정보 localStorage에 저장 완료", {
          categoryName: categoryToSave,
        });
      }
    } catch (error) {
      console.error("통화 정보 저장 실패:", error);
    }
  },

  restoreCallFromStorage: (): StoredCallInfo | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const storedInfo: StoredCallInfo = JSON.parse(stored);

      // 저장된 정보가 유효한지 확인 (30초 이내만 복원 - 백엔드 유예 시간과 일치)
      const elapsed = Date.now() - storedInfo.timestamp;
      const THIRTY_SECONDS = 30 * 1000; // 30초 (밀리초)

      if (elapsed >= THIRTY_SECONDS) {
        // 30초 초과 - 만료됨, 삭제
        if (import.meta.env.DEV) {
          console.log("⏰ 저장된 통화 정보가 30초 초과 - 만료됨, 삭제");
        }
        get().clearCallFromStorage();
        return null;
      }

      if (import.meta.env.DEV) {
        console.log(
          "💾 localStorage에서 통화 정보 복원:",
          storedInfo,
          `(경과 시간: ${Math.round(elapsed / 1000)}초)`,
        );
      }

      return storedInfo;
    } catch (error) {
      console.error("통화 정보 복원 실패:", error);
      get().clearCallFromStorage();
      return null;
    }
  },

  clearCallFromStorage: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      if (import.meta.env.DEV) {
        console.log("🗑️ localStorage에서 통화 정보 삭제 완료");
      }
    } catch (error) {
      console.error("통화 정보 삭제 실패:", error);
    }
  },
}));
