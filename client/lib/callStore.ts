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
  },
  error: null,
};

/**
 * 통화 스토어 생성
 */
export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  startCall: (notification: CallStartNotification) => {
    console.log("통화 시작:", notification);

    // 백엔드 데이터를 프론트엔드 형식으로 변환
    const partner = {
      id: notification.partnerId,
      nickname: notification.partnerNickname,
    };

    set({
      callId: notification.callId,
      matchingId: notification.matchingId || null,
      partner: partner,
      agoraChannelInfo: null, // useCall에서 직접 생성하므로 null
      isInCall: true,
      callStartTime: new Date(),
      error: null,
    });
  },

  endCall: () => {
    console.log("통화 종료");
    set({
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
      },
      error: null,
    });
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
}));
