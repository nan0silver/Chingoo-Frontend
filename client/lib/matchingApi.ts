import {
  MatchingRequest,
  MatchingStatus,
  Category,
  MatchingResponse,
  CategoriesResponse,
} from "@shared/api";
import { refreshToken } from "./auth";
import { logger } from "./logger";

/**
 * API 기본 설정
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
  : "/api"; // 개발/프로덕션 모두 상대 경로 사용 (프록시 또는 같은 도메인)

/**
 * HTTP 요청 헤더 생성
 */
const createHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * API 응답 처리
 */
const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    logger.error(`❌ API 응답 에러: ${response.status} ${response.statusText}`);

    const errorData = await response.json().catch((parseError) => {
      logger.error("❌ JSON 파싱 실패:", parseError);
      return { message: "알 수 없는 오류가 발생했습니다." };
    });

    logger.error("❌ 서버 에러 데이터:", errorData);
    throw new Error(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
};

/**
 * API 응답 타입
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 매칭 API 서비스 클래스
 */
export class MatchingApiService {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * JWT 토큰 설정
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * 토큰 제거
   */
  clearToken(): void {
    this.token = undefined;
  }

  /**
   * 매칭 참가
   * POST /api/v1/calls/match
   */
  async joinMatching(request: MatchingRequest): Promise<MatchingResponse> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    const url = `${this.baseUrl}/v1/calls/match`;
    logger.apiRequest("POST", "/v1/calls/match", request);

    try {
      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
        body: JSON.stringify(request),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(url, {
            method: "POST",
            headers: createHeaders(newToken),
            body: JSON.stringify(request),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: ApiResponse<MatchingResponse> =
        await handleApiResponse(response);

      if (!result.data) {
        throw new Error(result.message || "매칭 참가에 실패했습니다.");
      }

      return result.data;
    } catch (error) {
      console.error("매칭 참가 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("매칭 참가 중 오류가 발생했습니다.");
    }
  }

  /**
   * 매칭 상태 조회
   * GET /api/v1/calls/match/status
   */
  async getMatchingStatus(): Promise<MatchingStatus> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      let response = await fetch(`${this.baseUrl}/v1/calls/match/status`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(`${this.baseUrl}/v1/calls/match/status`, {
            method: "GET",
            headers: createHeaders(newToken),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: ApiResponse<MatchingStatus> =
        await handleApiResponse(response);

      if (!result.success || !result.data) {
        throw new Error(result.message || "매칭 상태 조회에 실패했습니다.");
      }

      return result.data;
    } catch (error) {
      console.error("매칭 상태 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("매칭 상태 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 매칭 취소
   * DELETE /api/v1/calls/match
   */
  async cancelMatching(queueId: string): Promise<void> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      let response = await fetch(`${this.baseUrl}/v1/calls/match`, {
        method: "DELETE",
        headers: createHeaders(this.token),
        body: JSON.stringify({ queue_id: queueId }),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(`${this.baseUrl}/v1/calls/match`, {
            method: "DELETE",
            headers: createHeaders(newToken),
            body: JSON.stringify({ queue_id: queueId }),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      // HTTP 상태 코드가 200-299 범위면 성공으로 간주
      // handleApiResponse에서 이미 에러 처리를 했으므로 여기서는 추가 체크 불필요
    } catch (error) {
      console.error("매칭 취소 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("매칭 취소 중 오류가 발생했습니다.");
    }
  }

  /**
   * 활성 카테고리 목록 조회
   * GET /api/v1/categories/active
   */
  async getActiveCategories(): Promise<Category[]> {
    try {
      let response = await fetch(`${this.baseUrl}/v1/categories/active`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(`${this.baseUrl}/v1/categories/active`, {
            method: "GET",
            headers: createHeaders(newToken),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: ApiResponse<CategoriesResponse> =
        await handleApiResponse(response);

      if (!result.success || !result.data) {
        throw new Error(result.message || "카테고리 목록 조회에 실패했습니다.");
      }

      return result.data.categories;
    } catch (error) {
      console.error("카테고리 목록 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("카테고리 목록 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 특정 카테고리 정보 조회
   * GET /api/v1/categories/{id}
   */
  async getCategory(categoryId: number): Promise<Category> {
    try {
      let response = await fetch(
        `${this.baseUrl}/v1/categories/${categoryId}`,
        {
          method: "GET",
          headers: createHeaders(this.token),
        },
      );

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(
            `${this.baseUrl}/v1/categories/${categoryId}`,
            {
              method: "GET",
              headers: createHeaders(newToken),
            },
          );
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: ApiResponse<Category> = await handleApiResponse(response);

      if (!result.success || !result.data) {
        throw new Error(result.message || "카테고리 정보 조회에 실패했습니다.");
      }

      return result.data;
    } catch (error) {
      console.error("카테고리 정보 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("카테고리 정보 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 매칭 대기열 위치 조회
   * GET /api/v1/calls/match/queue/position
   */
  async getQueuePosition(): Promise<{
    position: number;
    estimatedWaitTime: number;
  }> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      let response = await fetch(
        `${this.baseUrl}/v1/calls/match/queue/position`,
        {
          method: "GET",
          headers: createHeaders(this.token),
        },
      );

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(
            `${this.baseUrl}/v1/calls/match/queue/position`,
            {
              method: "GET",
              headers: createHeaders(newToken),
            },
          );
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: ApiResponse<{
        position: number;
        estimatedWaitTime: number;
      }> = await handleApiResponse(response);

      if (!result.success || !result.data) {
        throw new Error(result.message || "대기열 위치 조회에 실패했습니다.");
      }

      return result.data;
    } catch (error) {
      console.error("대기열 위치 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("대기열 위치 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 통화 통계 전송
   * POST /api/v1/calls/{callId}/statistics
   *
   * 통화 종료 시 Agora에서 수집한 통계 정보를 백엔드로 전송
   */
  async sendCallStatistics(
    callId: string,
    statistics: {
      duration: number;
      sendBytes: number;
      receiveBytes: number;
      sendBitrate: number;
      receiveBitrate: number;
      audioSendBytes: number;
      audioReceiveBytes: number;
      uplinkNetworkQuality: number;
      downlinkNetworkQuality: number;
      networkQualityDescription: string;
      totalDataUsageMB: number;
      averageNetworkQuality: number;
    },
  ): Promise<void> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/calls/${callId}/statistics`;
      logger.apiRequest("POST", `/v1/calls/${callId}/statistics`, statistics);

      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
        credentials: "include",
        body: JSON.stringify(statistics),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "POST",
            headers: createHeaders(newToken),
            credentials: "include",
            body: JSON.stringify(statistics),
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      // 204 No Content 또는 200 OK 모두 성공으로 처리
      if (response.status === 204 || response.ok) {
        if (import.meta.env.DEV) {
          logger.log(`✅ 통화 통계 전송 성공 (${response.status})`);
        }
        return;
      }

      // 에러 처리
      const result = await handleApiResponse(response);
      if (import.meta.env.DEV) {
        logger.log(`✅ 통화 통계 전송 성공`, result);
      }
    } catch (error) {
      // 통계 전송 실패는 치명적이지 않으므로 에러를 로그만 남기고 throw하지 않음
      logger.error("⚠️ 통화 통계 전송 실패 (무시):", error);
      // 사용자 경험에 영향을 주지 않도록 에러를 throw하지 않음
    }
  }

  /**
   * RTC 토큰 갱신
   * POST /api/v1/calls/{callId}/renew-token
   *
   * 주의: 백엔드 API 엔드포인트를 확인하고 맞춰주세요!
   * 가능한 엔드포인트:
   * - POST /v1/calls/{callId}/renew-token
   * - POST /v1/calls/rtc-token/renew
   * - POST /v1/rtc/token/renew
   */
  async renewRtcToken(callId: string): Promise<{
    rtcToken: string;
    expiresAt: string;
  }> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/calls/${callId}/renew-token`;
      logger.apiRequest("POST", `/v1/calls/${callId}/renew-token`, {});

      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken;
          response = await fetch(url, {
            method: "POST",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      // handleApiResponse는 에러 시 throw하므로, 여기 도달하면 성공
      const result: {
        data: {
          rtcToken: string;
          expiresAt: string;
        };
        message?: string;
        timestamp?: string;
      } = await handleApiResponse(response);

      if (import.meta.env.DEV) {
        logger.log(`✅ RTC 토큰 갱신 성공 (${response.status})`);
      }

      // 백엔드 response에는 success 필드가 없음 (200 OK면 성공)
      if (!result.data || !result.data.rtcToken) {
        throw new Error(result.message || "RTC 토큰 갱신에 실패했습니다.");
      }

      return result.data;
    } catch (error) {
      logger.error("RTC 토큰 갱신 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("RTC 토큰 갱신에 실패했습니다.");
    }
  }

  /**
   * 매칭 통계 조회 (선택사항)
   * GET /api/v1/calls/match/stats
   */
  async getMatchingStats(): Promise<{
    totalMatches: number;
    averageWaitTime: number;
    successRate: number;
  }> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      let response = await fetch(`${this.baseUrl}/v1/calls/match/stats`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(`${this.baseUrl}/v1/calls/match/stats`, {
            method: "GET",
            headers: createHeaders(newToken),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: ApiResponse<{
        totalMatches: number;
        averageWaitTime: number;
        successRate: number;
      }> = await handleApiResponse(response);

      if (!result.success || !result.data) {
        throw new Error(result.message || "매칭 통계 조회에 실패했습니다.");
      }

      return result.data;
    } catch (error) {
      console.error("매칭 통계 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("매칭 통계 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 채널 나가기
   * POST /api/v1/calls/{callId}/channel/leave
   */
  async leaveChannel(callId: string): Promise<void> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/calls/${callId}/channel/leave`;
      logger.apiRequest("POST", `/v1/calls/${callId}/channel/leave`);

      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(url, {
            method: "POST",
            headers: createHeaders(newToken),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      // HTTP 상태 코드가 200-299 범위면 성공으로 간주
      await handleApiResponse(response);
      console.log("✅ 채널 나가기 API 호출 성공");
    } catch (error) {
      console.error("채널 나가기 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("채널 나가기 중 오류가 발생했습니다.");
    }
  }

  /**
   * 통화 종료
   * POST /api/v1/calls/{callId}/end
   */
  async endCall(callId: string): Promise<void> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/calls/${callId}/end`;
      logger.apiRequest("POST", `/v1/calls/${callId}/end`);

      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(url, {
            method: "POST",
            headers: createHeaders(newToken),
          });
        } else {
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      // HTTP 상태 코드가 200-299 범위면 성공으로 간주
      await handleApiResponse(response);
      console.log("✅ 통화 종료 API 호출 성공");
    } catch (error) {
      console.error("통화 종료 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("통화 종료 중 오류가 발생했습니다.");
    }
  }

  /**
   * 통화 평가 제출
   * POST /api/v1/evaluations
   */
  async submitEvaluation(request: {
    call_id: number;
    feedback_type: "POSITIVE" | "NEGATIVE";
    negative: boolean;
    positive: boolean;
  }): Promise<void> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/evaluations`;
      logger.apiRequest("POST", "/v1/evaluations", request);

      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
        body: JSON.stringify(request),
      });

      console.log(`📡 통화 평가 API 첫 번째 요청 응답: ${response.status}`);

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        console.log("🔑 통화 평가에서 401 에러 발생, 토큰 갱신 시도 중...");
        const newToken = await refreshToken();
        if (newToken) {
          console.log("✅ 토큰 갱신 성공, 새 토큰으로 재시도 중...");
          // 토큰 갱신 성공 시 새 토큰으로 재시도
          this.token = newToken; // 클래스의 토큰도 업데이트
          response = await fetch(url, {
            method: "POST",
            headers: createHeaders(newToken),
            body: JSON.stringify(request),
          });
          console.log(`🔄 토큰 갱신 후 재시도 결과: ${response.status}`);
        } else {
          console.error("❌ 토큰 갱신 실패");
          // 토큰 갱신 실패 시 인증 오류로 처리
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      // HTTP 상태 코드가 200-299 범위면 성공으로 간주
      await handleApiResponse(response);
      console.log("✅ 통화 평가 API 호출 성공");
    } catch (error) {
      console.error("통화 평가 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("통화 평가 중 오류가 발생했습니다.");
    }
  }
}

// 싱글톤 인스턴스 - 지연 초기화
let matchingApiServiceInstance: MatchingApiService | null = null;

export const getMatchingApiService = (): MatchingApiService => {
  if (!matchingApiServiceInstance) {
    matchingApiServiceInstance = new MatchingApiService();
  }
  return matchingApiServiceInstance;
};

// 기존 호환성을 위한 export
export const matchingApiService = getMatchingApiService();
