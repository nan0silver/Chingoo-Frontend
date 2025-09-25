import SockJS from "sockjs-client";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import {
  WebSocketMessage,
  MatchingNotification,
  CallStartNotification,
  WebSocketConnectionState,
} from "@shared/api";

export class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connectionState: WebSocketConnectionState = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  };

  private onConnectionStateChange?: (state: WebSocketConnectionState) => void;
  private onMatchingNotification?: (notification: MatchingNotification) => void;
  private onCallStartNotification?: (
    notification: CallStartNotification,
  ) => void;
  private onError?: (error: string) => void;

  constructor() {
    // setupClient는 connect 시점에 호출
  }

  private setupClient() {
    // SockJS를 사용하여 WebSocket 연결 설정
    const socket = new SockJS("/ws");

    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log("STOMP Debug:", str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // 연결 성공 시
    this.client.onConnect = (frame) => {
      console.log("WebSocket 연결 성공:", frame);
      this.connectionState = {
        ...this.connectionState,
        isConnected: true,
        isConnecting: false,
        reconnectAttempts: 0,
        lastConnected: new Date().toISOString(),
      };
      this.onConnectionStateChange?.(this.connectionState);
      this.subscribeToQueues();
    };

    // 연결 실패 시
    this.client.onStompError = (frame) => {
      console.error("STOMP 에러:", frame);
      this.connectionState = {
        ...this.connectionState,
        isConnected: false,
        isConnecting: false,
      };
      this.onConnectionStateChange?.(this.connectionState);
      this.onError?.(
        `WebSocket 연결 실패: ${frame.headers.message || "알 수 없는 오류"}`,
      );
    };

    // 연결 해제 시
    this.client.onDisconnect = () => {
      console.log("WebSocket 연결 해제");
      this.connectionState = {
        ...this.connectionState,
        isConnected: false,
        isConnecting: false,
      };
      this.onConnectionStateChange?.(this.connectionState);
    };
  }

  /**
   * JWT 토큰을 사용하여 WebSocket 연결
   */
  async connect(token: string): Promise<void> {
    if (this.connectionState.isConnected || this.connectionState.isConnecting) {
      console.log("이미 연결 중이거나 연결되어 있습니다.");
      return;
    }

    try {
      this.connectionState = {
        ...this.connectionState,
        isConnecting: true,
      };
      this.onConnectionStateChange?.(this.connectionState);

      // 클라이언트가 없으면 새로 생성
      if (!this.client) {
        this.setupClient();
      }

      // JWT 토큰을 헤더에 포함하여 연결
      this.client!.connectHeaders = {
        Authorization: `Bearer ${token}`,
      };

      await this.client!.activate();
    } catch (error) {
      console.error("WebSocket 연결 실패:", error);
      this.connectionState = {
        ...this.connectionState,
        isConnecting: false,
        reconnectAttempts: this.connectionState.reconnectAttempts + 1,
      };
      this.onConnectionStateChange?.(this.connectionState);
      this.onError?.(
        `연결 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      );
      throw error;
    }
  }

  /**
   * WebSocket 연결 해제
   */
  disconnect(): void {
    if (this.client && this.connectionState.isConnected) {
      this.unsubscribeFromQueues();
      this.client.deactivate();
    }
  }

  /**
   * 매칭 및 통화 관련 큐 구독
   */
  private subscribeToQueues(): void {
    if (!this.client || !this.connectionState.isConnected) {
      return;
    }

    // 매칭 알림 구독
    const matchingSubscription = this.client.subscribe(
      "/queue/matching",
      (message: IMessage) => {
        try {
          const notification: MatchingNotification = JSON.parse(message.body);
          console.log("매칭 알림 수신:", notification);
          this.onMatchingNotification?.(notification);
        } catch (error) {
          console.error("매칭 알림 파싱 오류:", error);
          this.onError?.("매칭 알림 처리 중 오류가 발생했습니다.");
        }
      },
    );

    // 통화 시작 알림 구독
    const callStartSubscription = this.client.subscribe(
      "/queue/call-start",
      (message: IMessage) => {
        try {
          const notification: CallStartNotification = JSON.parse(message.body);
          console.log("통화 시작 알림 수신:", notification);
          this.onCallStartNotification?.(notification);
        } catch (error) {
          console.error("통화 시작 알림 파싱 오류:", error);
          this.onError?.("통화 시작 알림 처리 중 오류가 발생했습니다.");
        }
      },
    );

    this.subscriptions.set("matching", matchingSubscription);
    this.subscriptions.set("call-start", callStartSubscription);
  }

  /**
   * 모든 큐 구독 해제
   */
  private unsubscribeFromQueues(): void {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe();
      console.log(`구독 해제: ${key}`);
    });
    this.subscriptions.clear();
  }

  /**
   * 연결 상태 변경 콜백 설정
   */
  onConnectionStateChangeCallback(
    callback: (state: WebSocketConnectionState) => void,
  ): void {
    this.onConnectionStateChange = callback;
  }

  /**
   * 매칭 알림 콜백 설정
   */
  onMatchingNotificationCallback(
    callback: (notification: MatchingNotification) => void,
  ): void {
    this.onMatchingNotification = callback;
  }

  /**
   * 통화 시작 알림 콜백 설정
   */
  onCallStartNotificationCallback(
    callback: (notification: CallStartNotification) => void,
  ): void {
    this.onCallStartNotification = callback;
  }

  /**
   * 에러 콜백 설정
   */
  onErrorCallback(callback: (error: string) => void): void {
    this.onError = callback;
  }

  /**
   * 현재 연결 상태 반환
   */
  getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  /**
   * 연결 여부 확인
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * 재연결 시도
   */
  async reconnect(token: string): Promise<void> {
    if (
      this.connectionState.reconnectAttempts >=
      this.connectionState.maxReconnectAttempts
    ) {
      throw new Error("최대 재연결 시도 횟수를 초과했습니다.");
    }

    console.log(
      `재연결 시도 ${this.connectionState.reconnectAttempts + 1}/${this.connectionState.maxReconnectAttempts}`,
    );

    this.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기
    await this.connect(token);
  }

  /**
   * 서비스 정리
   */
  destroy(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.client = null;
    this.onConnectionStateChange = undefined;
    this.onMatchingNotification = undefined;
    this.onCallStartNotification = undefined;
    this.onError = undefined;
  }
}

// 싱글톤 인스턴스 - 지연 초기화
let webSocketServiceInstance: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketServiceInstance) {
    webSocketServiceInstance = new WebSocketService();
  }
  return webSocketServiceInstance;
};

// 기존 호환성을 위한 export
export const webSocketService = getWebSocketService();
