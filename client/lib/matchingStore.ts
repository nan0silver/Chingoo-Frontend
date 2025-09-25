import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  MatchingRequest,
  MatchingStatus,
  Category,
  MatchingNotification,
  CallStartNotification,
  WebSocketConnectionState,
  Location,
} from "@shared/api";
import { matchingApiService } from "./matchingApi";
import { webSocketService } from "./websocket";
import { getStoredToken } from "./auth";

/**
 * 매칭 상태 타입
 */
interface MatchingState {
  // 매칭 상태
  status: "idle" | "waiting" | "matched" | "cancelled" | "timeout";

  // 매칭 정보
  matchingId?: string;
  categoryId?: number;
  location?: Location;

  // 대기 정보
  queuePosition?: number;
  estimatedWaitTime?: number;

  // 매칭된 사용자 정보
  matchedUser?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    age?: number;
    gender?: "male" | "female";
  };

  // WebSocket 연결 상태
  connectionState: WebSocketConnectionState;

  // 카테고리 목록
  categories: Category[];

  // 에러 정보
  error?: string;

  // 타임스탬프
  createdAt?: string;
  updatedAt?: string;
}

interface MatchingStore extends MatchingState {
  // 액션들
  startMatching: (request: MatchingRequest) => Promise<void>;
  cancelMatching: () => Promise<void>;
  refreshMatchingStatus: () => Promise<void>;
  loadCategories: () => Promise<void>;
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  resetMatching: () => void;

  // 내부 액션들
  setMatchingStatus: (status: MatchingStatus) => void;
  setConnectionState: (state: Partial<WebSocketConnectionState>) => void;
  setError: (error: string | null) => void;
  setCategories: (categories: Category[]) => void;
  handleMatchingNotification: (notification: MatchingNotification) => void;
  handleCallStartNotification: (notification: CallStartNotification) => void;
}

const initialState: MatchingState = {
  status: "idle",
  matchingId: undefined,
  categoryId: undefined,
  location: undefined,
  queuePosition: undefined,
  estimatedWaitTime: undefined,
  matchedUser: undefined,
  connectionState: {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  },
  categories: [],
  error: undefined,
  createdAt: undefined,
  updatedAt: undefined,
};

export const useMatchingStore = create<MatchingStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 매칭 시작
        startMatching: async (request: MatchingRequest) => {
          try {
            set({
              error: null,
              status: "waiting",
            });

            const token = getStoredToken();
            if (!token) {
              throw new Error("인증 토큰이 필요합니다.");
            }

            // API 서비스에 토큰 설정
            matchingApiService.setToken(token);

            // 매칭 참가 요청
            const response = await matchingApiService.joinMatching(request);

            set({
              matchingId: response.matchingId,
              status: response.status,
              categoryId: request.categoryId,
              location: request.location,
              queuePosition: response.queuePosition,
              estimatedWaitTime: response.estimatedWaitTime,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            // WebSocket 연결 (아직 연결되지 않은 경우)
            if (!get().connectionState.isConnected) {
              await get().connectWebSocket();
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "매칭 시작 중 오류가 발생했습니다.";
            set({
              error: errorMessage,
              status: "idle",
            });
            throw error;
          }
        },

        // 매칭 취소
        cancelMatching: async () => {
          try {
            set({ error: null });

            const token = getStoredToken();
            if (!token) {
              throw new Error("인증 토큰이 필요합니다.");
            }

            matchingApiService.setToken(token);
            await matchingApiService.cancelMatching();

            set({
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "매칭 취소 중 오류가 발생했습니다.";
            set({ error: errorMessage });
            throw error;
          }
        },

        // 매칭 상태 새로고침
        refreshMatchingStatus: async () => {
          try {
            set({ error: null });

            const token = getStoredToken();
            if (!token) {
              throw new Error("인증 토큰이 필요합니다.");
            }

            matchingApiService.setToken(token);
            const status = await matchingApiService.getMatchingStatus();

            get().setMatchingStatus(status);
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "매칭 상태 조회 중 오류가 발생했습니다.";
            set({ error: errorMessage });
            throw error;
          }
        },

        // 카테고리 목록 로드
        loadCategories: async () => {
          try {
            set({ error: null });

            const token = getStoredToken();
            matchingApiService.setToken(token || undefined);

            const categories = await matchingApiService.getActiveCategories();
            set({ categories });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "카테고리 목록 로드 중 오류가 발생했습니다.";
            set({ error: errorMessage });
            throw error;
          }
        },

        // WebSocket 연결
        connectWebSocket: async () => {
          try {
            const token = getStoredToken();
            if (!token) {
              throw new Error("인증 토큰이 필요합니다.");
            }

            set({
              error: null,
              connectionState: {
                ...get().connectionState,
                isConnecting: true,
              },
            });

            // WebSocket 서비스 콜백 설정
            webSocketService.onConnectionStateChangeCallback((state) => {
              get().setConnectionState(state);
            });

            webSocketService.onMatchingNotificationCallback((notification) => {
              get().handleMatchingNotification(notification);
            });

            webSocketService.onCallStartNotificationCallback((notification) => {
              get().handleCallStartNotification(notification);
            });

            webSocketService.onErrorCallback((error) => {
              get().setError(error);
            });

            await webSocketService.connect(token);
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "WebSocket 연결 중 오류가 발생했습니다.";
            set({
              error: errorMessage,
              connectionState: {
                ...get().connectionState,
                isConnecting: false,
              },
            });
            throw error;
          }
        },

        // WebSocket 연결 해제
        disconnectWebSocket: () => {
          webSocketService.disconnect();
          set({
            connectionState: {
              ...get().connectionState,
              isConnected: false,
              isConnecting: false,
            },
          });
        },

        // 매칭 상태 설정
        setMatchingStatus: (status: MatchingStatus) => {
          set({
            status: status.status,
            queuePosition: status.queuePosition,
            estimatedWaitTime: status.estimatedWaitTime,
            categoryId: status.categoryId,
            location: status.location,
            matchedUser: status.matchedUser,
            updatedAt: new Date().toISOString(),
          });
        },

        // 연결 상태 설정
        setConnectionState: (state: Partial<WebSocketConnectionState>) => {
          set({
            connectionState: {
              ...get().connectionState,
              ...state,
            },
          });
        },

        // 에러 설정
        setError: (error: string | null) => {
          set({ error });
        },

        // 카테고리 설정
        setCategories: (categories: Category[]) => {
          set({ categories });
        },

        // 매칭 알림 처리
        handleMatchingNotification: (notification: MatchingNotification) => {
          const currentState = get();

          switch (notification.type) {
            case "matched":
              set({
                status: "matched",
                matchedUser: notification.matchedUser,
                updatedAt: new Date().toISOString(),
              });
              break;

            case "cancelled":
              set({
                status: "cancelled",
                updatedAt: new Date().toISOString(),
              });
              break;

            case "timeout":
              set({
                status: "timeout",
                updatedAt: new Date().toISOString(),
              });
              break;
          }
        },

        // 통화 시작 알림 처리
        handleCallStartNotification: (notification: CallStartNotification) => {
          // 통화 시작 알림을 받으면 통화 페이지로 이동할 수 있도록 상태 업데이트
          set({
            updatedAt: new Date().toISOString(),
          });

          // 여기서 통화 페이지로 네비게이션할 수 있습니다
          // 예: window.location.href = `/call/${notification.callId}`;
        },

        // 매칭 상태 초기화
        resetMatching: () => {
          set({
            ...initialState,
            categories: get().categories, // 카테고리는 유지
            connectionState: get().connectionState, // 연결 상태는 유지
          });
        },
      }),
      {
        name: "matching-store",
        // 민감한 정보는 persist에서 제외
        partialize: (state) => ({
          categories: state.categories,
          connectionState: state.connectionState,
        }),
      },
    ),
    {
      name: "matching-store",
    },
  ),
);

// WebSocket 서비스 정리 함수
export const cleanupMatchingStore = () => {
  webSocketService.destroy();
  useMatchingStore.getState().resetMatching();
};
