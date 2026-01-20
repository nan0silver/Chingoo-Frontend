import SockJS from "sockjs-client";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import {
  WebSocketMessage,
  MatchingNotification,
  CallStartNotification,
  WebSocketConnectionState,
} from "@shared/api";
import { Capacitor } from "@capacitor/core";
import { logger } from "./logger";

export class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connectionState: WebSocketConnectionState = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  };
  private currentToken: string | null = null; // 현재 인증 토큰 저장

  // 여러 콜백을 지원하기 위해 배열로 변경
  private onConnectionStateChangeCallbacks: Array<
    (state: WebSocketConnectionState) => void
  > = [];
  private onMatchingNotificationCallbacks: Array<
    (notification: MatchingNotification) => void
  > = [];
  private onCallStartNotificationCallbacks: Array<
    (notification: CallStartNotification) => void
  > = [];
  private onCallEndNotificationCallbacks: Array<(notification: any) => void> =
    [];
  private onErrorCallbacks: Array<(error: string) => void> = [];

  constructor() {
    // setupClient는 connect 시점에 호출
  }

  private setupClient(token?: string) {
    // SockJS를 사용하여 WebSocket 연결 설정
    // 네이티브 앱에서는 운영 서버의 WebSocket을 사용
    let wsUrl: string;

    if (Capacitor.isNativePlatform()) {
      // 네이티브 앱: HTTPS이므로 wss:// 사용
      wsUrl = "https://api.chingoohaja.app/ws";
      console.log("✅ 네이티브 앱 - WebSocket 운영 서버 사용");
    } else {
      // 웹: 환경변수 또는 프록시 사용
      wsUrl = import.meta.env.VITE_WS_BASE_URL
        ? String(import.meta.env.VITE_WS_BASE_URL)
        : "/ws"; // 개발/프로덕션 모두 상대 경로 사용 (프록시 또는 같은 도메인)
    }

    // ⚠️ 쿼리 파라미터로 토큰을 전달하지 않음 (SockJS /info 엔드포인트는 인증 불필요)
    // 대신 STOMP CONNECT 헤더로 토큰을 전달합니다
    console.log("🔗 WebSocket URL:", wsUrl);

    const sockJSOptions = {
      transports: ["websocket", "xhr-streaming", "xhr-polling"],
      timeout: 20000,
    };

    logger.log("🔗 WebSocket 연결 설정");
    //const socket = new SockJS(wsUrl);
    const socket = new SockJS(wsUrl, null, sockJSOptions);

    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log("STOMP Debug:", str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    // 연결 성공 시
    this.client.onConnect = (frame) => {
      console.log("✅ WebSocket 연결 성공:", frame);
      console.log("✅ 연결 헤더:", frame.headers);
      console.log("✅ 연결 바디:", frame.body);

      this.connectionState = {
        ...this.connectionState,
        isConnected: true,
        isConnecting: false,
        reconnectAttempts: 0,
        lastConnected: new Date().toISOString(),
      };
      // 모든 연결 상태 변경 콜백 호출
      this.onConnectionStateChangeCallbacks.forEach((callback) =>
        callback(this.connectionState),
      );
      console.log("📡 큐 구독 시작");
      this.subscribeToQueues();

      // 구독 완료 후 상태 로그
      setTimeout(() => {
        this.logSubscriptionStatus();
      }, 100);
    };

    // 연결 실패 시
    this.client.onStompError = (frame) => {
      console.error("❌ STOMP 에러:", frame);
      console.error("❌ 에러 헤더:", frame.headers);
      console.error("❌ 에러 바디:", frame.body);
      this.connectionState = {
        ...this.connectionState,
        isConnected: false,
        isConnecting: false,
      };
      // 모든 연결 상태 변경 콜백 호출
      this.onConnectionStateChangeCallbacks.forEach((callback) =>
        callback(this.connectionState),
      );
      const errorMessage = `WebSocket 연결 실패: ${frame.headers.message || "알 수 없는 오류"}`;
      // 모든 에러 콜백 호출
      this.onErrorCallbacks.forEach((callback) => callback(errorMessage));
    };

    // 연결 해제 시
    this.client.onDisconnect = () => {
      console.log("WebSocket 연결 해제");
      this.connectionState = {
        ...this.connectionState,
        isConnected: false,
        isConnecting: false,
      };
      // 모든 연결 상태 변경 콜백 호출
      this.onConnectionStateChangeCallbacks.forEach((callback) =>
        callback(this.connectionState),
      );
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
      console.log("🚀 WebSocket 연결 시도 시작");
      this.connectionState = {
        ...this.connectionState,
        isConnecting: true,
      };
      // 모든 연결 상태 변경 콜백 호출
      this.onConnectionStateChangeCallbacks.forEach((callback) =>
        callback(this.connectionState),
      );

      // 클라이언트가 없으면 새로 생성 (토큰 포함)
      if (!this.client) {
        console.log("📱 WebSocket 클라이언트 생성");
        this.setupClient(token); // 🔑 토큰을 전달
      }

      // JWT 토큰을 헤더에도 포함 (STOMP CONNECT 프레임용)
      this.client!.connectHeaders = {
        Authorization: `Bearer ${token}`,
      };
      // 메시지 전송 시에도 사용할 수 있도록 토큰 저장
      this.currentToken = token;
      console.log("🔑 JWT 토큰 설정 완료 (URL + 헤더)");
      if (import.meta.env.DEV) {
        console.log("🔑 토큰 길이:", token.length);
        console.log("🔑 토큰 앞 10자리:", token.substring(0, 10) + "...");
      }

      console.log("⚡ STOMP 클라이언트 활성화 시도");
      await this.client!.activate();
      console.log("✅ STOMP 클라이언트 활성화 성공");
    } catch (error) {
      console.error("❌ WebSocket 연결 실패:", error);
      if (import.meta.env.DEV) {
        console.error("❌ 에러 타입:", typeof error);
        console.error(
          "❌ 에러 스택:",
          error instanceof Error ? error.stack : "No stack",
        );
      }
      this.connectionState = {
        ...this.connectionState,
        isConnecting: false,
        reconnectAttempts: this.connectionState.reconnectAttempts + 1,
      };
      // 모든 연결 상태 변경 콜백 호출
      this.onConnectionStateChangeCallbacks.forEach((callback) =>
        callback(this.connectionState),
      );
      const errorMessage = `연결 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
      // 모든 에러 콜백 호출
      this.onErrorCallbacks.forEach((callback) => callback(errorMessage));
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
    // 토큰 초기화
    this.currentToken = null;
  }

  /**
   * 매칭 및 통화 관련 큐 구독
   */
  private subscribeToQueues(): void {
    if (!this.client || !this.connectionState.isConnected) {
      console.warn("⚠️ WebSocket 클라이언트가 없거나 연결되지 않음");
      return;
    }

    console.log("📡 큐 구독 시작 - 클라이언트 상태:", {
      isConnected: this.connectionState.isConnected,
      clientExists: !!this.client,
    });

    // 매칭 알림 구독
    console.log("📡 /user/queue/matching 구독 시작");
    const matchingSubscription = this.client.subscribe(
      "/user/queue/matching",
      (message: IMessage) => {
        try {
          console.log(
            "📨 [매칭] WebSocket 메시지 수신 (/user/queue/matching):",
            message.body,
          );
          const notification: MatchingNotification = JSON.parse(message.body);
          console.log("✅ [매칭] 알림 파싱 성공:", notification);
          console.log("📋 [매칭] 알림 상세:", {
            type: notification.type,
            matchingId: notification.matchingId,
            matchedUser: notification.matchedUser,
            message: notification.message,
            timestamp: notification.timestamp,
          });
          // 모든 매칭 알림 콜백 호출
          console.log(
            `🔔 [매칭] ${this.onMatchingNotificationCallbacks.length}개의 콜백 호출`,
          );
          this.onMatchingNotificationCallbacks.forEach((callback) =>
            callback(notification),
          );
        } catch (error) {
          console.error("❌ [매칭] 알림 파싱 오류:", error);
          console.error("❌ [매칭] 원본 메시지:", message.body);
          const errorMessage = "매칭 알림 처리 중 오류가 발생했습니다.";
          // 모든 에러 콜백 호출
          this.onErrorCallbacks.forEach((callback) => callback(errorMessage));
        }
      },
    );

    // 통화 시작 알림 구독
    console.log("📡 /user/queue/call-start 구독 시작");
    const callStartSubscription = this.client.subscribe(
      "/user/queue/call-start",
      (message: IMessage) => {
        try {
          console.log(
            "📨 [통화] WebSocket 메시지 수신 (/user/queue/call-start):",
            message.body,
          );
          const notification: CallStartNotification = JSON.parse(message.body);
          console.log("✅ [통화] 알림 파싱 성공:", notification);
          console.log("📋 [통화] 알림 상세:", {
            type: notification.type,
            callId: notification.callId,
            matchingId: notification.matchingId,
            partnerId: notification.partnerId,
            partnerNickname: notification.partnerNickname,
            channelName: notification.channelName,
            agoraUid: notification.agoraUid,
            timestamp: notification.timestamp,
          });
          // 모든 통화 시작 알림 콜백 호출
          console.log(
            `🔔 [통화] ${this.onCallStartNotificationCallbacks.length}개의 콜백 호출`,
          );
          this.onCallStartNotificationCallbacks.forEach((callback) =>
            callback(notification),
          );
        } catch (error) {
          console.error("❌ [통화] 알림 파싱 오류:", error);
          console.error("❌ [통화] 원본 메시지:", message.body);
          const errorMessage = "통화 시작 알림 처리 중 오류가 발생했습니다.";
          // 모든 에러 콜백 호출
          this.onErrorCallbacks.forEach((callback) => callback(errorMessage));
        }
      },
    );

    // 통화 종료 알림 구독
    console.log("📡 /user/queue/call-end 구독 시작");
    const callEndSubscription = this.client.subscribe(
      "/user/queue/call-end",
      (message: IMessage) => {
        try {
          console.log(
            "📨 [통화종료] WebSocket 메시지 수신 (/user/queue/call-end):",
            message.body,
          );
          const notification = JSON.parse(message.body);
          console.log("✅ [통화종료] 알림 파싱 성공:", notification);
          console.log("📋 [통화종료] 알림 상세:", {
            callId: notification.callId,
            reason: notification.reason,
          });
          // 모든 통화 종료 알림 콜백 호출
          console.log(
            `🔔 [통화종료] ${this.onCallEndNotificationCallbacks.length}개의 콜백 호출`,
          );
          this.onCallEndNotificationCallbacks.forEach((callback) =>
            callback(notification),
          );
        } catch (error) {
          console.error("❌ [통화종료] 알림 파싱 오류:", error);
          console.error("❌ [통화종료] 원본 메시지:", message.body);
          const errorMessage = "통화 종료 알림 처리 중 오류가 발생했습니다.";
          // 모든 에러 콜백 호출
          this.onErrorCallbacks.forEach((callback) => callback(errorMessage));
        }
      },
    );

    this.subscriptions.set("matching", matchingSubscription);
    this.subscriptions.set("call-start", callStartSubscription);
    this.subscriptions.set("call-end", callEndSubscription);

    console.log("✅ 큐 구독 완료:", {
      matchingSubscribed: this.subscriptions.has("matching"),
      callStartSubscribed: this.subscriptions.has("call-start"),
      callEndSubscribed: this.subscriptions.has("call-end"),
      totalSubscriptions: this.subscriptions.size,
    });
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
   * 연결 상태 변경 콜백 설정 (여러 콜백 지원)
   */
  onConnectionStateChangeCallback(
    callback: (state: WebSocketConnectionState) => void,
  ): void {
    // 중복 방지: 이미 등록된 콜백이 아니면 추가
    if (!this.onConnectionStateChangeCallbacks.includes(callback)) {
      this.onConnectionStateChangeCallbacks.push(callback);
      console.log(
        `✅ 연결 상태 변경 콜백 추가 (총 ${this.onConnectionStateChangeCallbacks.length}개)`,
      );
    }
  }

  /**
   * 매칭 알림 콜백 설정 (여러 콜백 지원)
   */
  onMatchingNotificationCallback(
    callback: (notification: MatchingNotification) => void,
  ): void {
    // 중복 방지: 이미 등록된 콜백이 아니면 추가
    if (!this.onMatchingNotificationCallbacks.includes(callback)) {
      this.onMatchingNotificationCallbacks.push(callback);
      console.log(
        `✅ 매칭 알림 콜백 추가 (총 ${this.onMatchingNotificationCallbacks.length}개)`,
      );
    }
  }

  /**
   * 통화 시작 알림 콜백 설정 (여러 콜백 지원)
   */
  onCallStartNotificationCallback(
    callback: (notification: CallStartNotification) => void,
  ): void {
    // 중복 방지: 이미 등록된 콜백이 아니면 추가
    if (!this.onCallStartNotificationCallbacks.includes(callback)) {
      this.onCallStartNotificationCallbacks.push(callback);
      console.log(
        `✅ 통화 시작 알림 콜백 추가 (총 ${this.onCallStartNotificationCallbacks.length}개)`,
      );
    }
  }

  /**
   * 통화 종료 알림 콜백 설정 (여러 콜백 지원)
   */
  onCallEndNotificationCallback(callback: (notification: any) => void): void {
    // 중복 방지: 이미 등록된 콜백이 아니면 추가
    if (!this.onCallEndNotificationCallbacks.includes(callback)) {
      this.onCallEndNotificationCallbacks.push(callback);
      console.log(
        `✅ 통화 종료 알림 콜백 추가 (총 ${this.onCallEndNotificationCallbacks.length}개)`,
      );
    }
  }

  /**
   * 에러 콜백 설정 (여러 콜백 지원)
   */
  onErrorCallback(callback: (error: string) => void): void {
    // 중복 방지: 이미 등록된 콜백이 아니면 추가
    if (!this.onErrorCallbacks.includes(callback)) {
      this.onErrorCallbacks.push(callback);
      console.log(`✅ 에러 콜백 추가 (총 ${this.onErrorCallbacks.length}개)`);
    }
  }

  /**
   * WebSocket 메시지 전송
   */
  sendMessage(destination: string, message: any): void {
    if (!this.client || !this.connectionState.isConnected) {
      console.error("❌ WebSocket이 연결되지 않음 - 메시지 전송 실패");
      throw new Error("WebSocket이 연결되지 않았습니다.");
    }

    try {
      if (import.meta.env.DEV) {
        console.log("📤 WebSocket 메시지 전송:", { destination, message });
      }

      // 인증 헤더 포함 (서버에서 사용자 정보를 확인하기 위해 필요)
      const headers: Record<string, string> = {};
      if (this.currentToken) {
        headers.Authorization = `Bearer ${this.currentToken}`;
        if (import.meta.env.DEV) {
          console.log("🔑 WebSocket 메시지에 인증 헤더 포함");
        }
      } else {
        console.warn("⚠️ WebSocket 토큰이 없음 - 인증 헤더 없이 전송");
      }

      this.client.publish({
        destination,
        body: JSON.stringify(message),
        headers,
      });
      console.log("✅ WebSocket 메시지 전송 성공");
    } catch (error) {
      console.error("❌ WebSocket 메시지 전송 실패:", error);
      throw error;
    }
  }

  /**
   * 통화 종료 알림 전송
   */
  sendCallEndNotification(
    callId: number,
    partnerId: number,
    reason: string = "USER_LEFT",
  ): void {
    // ✅ 백엔드 CallEndMessage 형식에 맞춤
    const message = {
      callId: callId,
      reason: reason, // "USER_LEFT", "REFRESH", "NETWORK_ERROR" 등
    };

    const destination = `/app/call-end/${partnerId}`;
    if (import.meta.env.DEV) {
      console.log("📤 WebSocket 메시지 전송:", { destination, message });
    }

    this.sendMessage(destination, message);
    if (import.meta.env.DEV) {
      console.log("✅ WebSocket 메시지 전송 성공");
    }
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
   * 구독 상태 확인
   */
  getSubscriptionStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.subscriptions.forEach((subscription, key) => {
      status[key] = true;
    });
    return status;
  }

  /**
   * 구독 상태 로그 출력
   */
  logSubscriptionStatus(): void {
    console.log("📊 WebSocket 구독 상태:", {
      isConnected: this.connectionState.isConnected,
      subscriptions: this.getSubscriptionStatus(),
      totalSubscriptions: this.subscriptions.size,
      lastConnected: this.connectionState.lastConnected,
    });
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
    this.client = null; // 🔑 클라이언트를 null로 설정하여 새 토큰으로 재생성
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
    // 모든 콜백 배열 초기화
    this.onConnectionStateChangeCallbacks = [];
    this.onMatchingNotificationCallbacks = [];
    this.onCallStartNotificationCallbacks = [];
    this.onCallEndNotificationCallbacks = [];
    this.onErrorCallbacks = [];
    console.log("🧹 WebSocket 서비스 정리 완료");
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
