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
import { webSocketService, getWebSocketService } from "./websocket";
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
            console.log("🎯 startMatching 함수 호출됨:", request);
            set({
              error: null,
              status: "waiting",
            });

            const token = getStoredToken();
            console.log("🔑 토큰 확인:", token ? "토큰 있음" : "토큰 없음");
            if (!token) {
              throw new Error("인증 토큰이 필요합니다.");
            }

            // API 서비스에 토큰 설정
            matchingApiService.setToken(token);

            // 매칭 참가 요청
            console.log("📡 매칭 API 호출 시작");
            const response = await matchingApiService.joinMatching(request);
            console.log("✅ 매칭 API 응답:", response);

            set({
              matchingId: response.queue_id,
              status: response.queue_status.toLowerCase() as
                | "waiting"
                | "matched"
                | "cancelled"
                | "timeout",
              categoryId: response.category_id,
              queuePosition: response.queue_position,
              estimatedWaitTime: Math.ceil(
                response.estimated_wait_time_seconds / 60,
              ), // 초를 분으로 변환
              createdAt: response.created_at,
              updatedAt: new Date().toISOString(),
            });

            // WebSocket 연결 시도 (실패해도 매칭은 계속 진행)
            console.log("🔍 WebSocket 연결 상태 확인:", get().connectionState);

            // WebSocket 서비스의 실제 연결 상태도 확인
            const wsService = getWebSocketService();
            const actualWsState = wsService.getConnectionState();
            console.log("🔍 실제 WebSocket 상태:", actualWsState);

            if (
              !get().connectionState.isConnected ||
              !actualWsState.isConnected
            ) {
              console.log("🚀 WebSocket 연결 시도 시작");
              try {
                await get().connectWebSocket();
                console.log("✅ WebSocket 연결 성공");
              } catch (wsError) {
                console.warn("❌ WebSocket 연결 실패, 폴링으로 대체:", wsError);
                // ⚠️ WebSocket 연결 실패 시 폴링으로 대체
                console.log("🔄 폴링 모드 시작 (3초마다 상태 확인)");
                // WebSocket 연결 실패해도 매칭은 계속 진행
              }
            } else {
              console.log("ℹ️ WebSocket 이미 연결됨");
              // 연결되어 있지만 구독이 안되어 있을 수 있으므로 구독 상태 확인
              const subscriptionStatus = wsService.getSubscriptionStatus();
              console.log("🔍 구독 상태 확인:", subscriptionStatus);
              if (Object.keys(subscriptionStatus).length === 0) {
                console.log("⚠️ 구독이 없음 - WebSocket 재연결 시도");
                try {
                  await get().connectWebSocket();
                } catch (wsError) {
                  console.warn("❌ 재연결 실패, 폴링으로 대체:", wsError);
                }
              }
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

            const { matchingId } = get();
            if (!matchingId) {
              throw new Error("취소할 매칭이 없습니다.");
            }

            matchingApiService.setToken(token);
            await matchingApiService.cancelMatching(matchingId);

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
            console.log("🔌 connectWebSocket 함수 호출됨");
            const token = getStoredToken();
            console.log("🔌 토큰 확인:", token ? "토큰 있음" : "토큰 없음");
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

            console.log("🔌 WebSocket 콜백 설정 시작");
            // WebSocket 서비스 콜백 설정
            webSocketService.onConnectionStateChangeCallback((state) => {
              console.log("🔌 연결 상태 변경:", state);
              get().setConnectionState(state);
            });

            webSocketService.onMatchingNotificationCallback((notification) => {
              console.log("🔌 매칭 알림 수신:", notification);
              get().handleMatchingNotification(notification);
            });

            webSocketService.onCallStartNotificationCallback((notification) => {
              console.log("🔌 통화 시작 알림 수신:", notification);
              get().handleCallStartNotification(notification);
            });

            webSocketService.onErrorCallback((error) => {
              console.log("🔌 WebSocket 에러:", error);
              get().setError(error);
            });

            console.log("🔌 WebSocket 연결 시도");
            await webSocketService.connect(token);
            console.log("🔌 WebSocket 연결 완료");
          } catch (error) {
            console.error("🔌 connectWebSocket 에러:", error);
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
            case "position_update":
              // 대기 위치 및 예상 대기 시간 업데이트
              set({
                queuePosition: notification.queuePosition,
                estimatedWaitTime: notification.estimatedWaitTime,
                updatedAt: new Date().toISOString(),
              });
              break;

            case "matched":
              set({
                status: "matched",
                matchedUser: notification.matchedUser,
                updatedAt: new Date().toISOString(),
              });
              // 매칭 성공 시 자동으로 통화 화면으로 이동
              // 이 이벤트는 App.tsx에서 감지하여 처리
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
