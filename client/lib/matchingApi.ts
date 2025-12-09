import {
  MatchingRequest,
  MatchingStatus,
  Category,
  MatchingResponse,
  CategoriesResponse,
  ActivityStats,
  CallHistoryItem,
  Friend,
  FriendsResponse,
  FriendRequest,
  SendFriendRequestRequest,
  SendFriendRequestResponse,
  FriendRequestsResponse,
  FriendRequestActionResponse,
  DeleteFriendResponse,
} from "@shared/api";
import { refreshToken, getApiUrl } from "./auth";
import { logger } from "./logger";

/**
 * API 기본 설정
 * 네이티브 앱에서는 운영 서버(silverld.site)를 사용하고,
 * 웹에서는 환경변수 또는 프록시를 사용합니다.
 */
const API_BASE_URL = getApiUrl();

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
   * 사용자 활동 통계 조회
   * GET /api/v1/users/me/activity-stats
   */
  async getActivityStats(period?: "week" | "quarter"): Promise<ActivityStats> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const queryParams = period ? `?period=${period}` : "";
      const url = `${this.baseUrl}/v1/users/me/activity-stats${queryParams}`;
      logger.apiRequest("GET", `/v1/users/me/activity-stats${queryParams}`, {});

      let response = await fetch(url, {
        method: "GET",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "GET",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: {
        data: {
          weekly_stats: {
            call_count: number;
            total_duration_minutes: number;
            start_date: string;
            end_date: string;
          };
          quarterly_stats: {
            call_count: number;
            total_duration_minutes: number;
            start_date: string;
            end_date: string;
            quarter: number;
          };
          additional_stats: {
            average_call_duration_minutes: number;
            most_used_category: {
              id: number;
              name: string;
            };
            total_data_usage_mb: number;
            average_network_quality: number;
          };
        };
        message?: string;
        timestamp?: string;
      } = await handleApiResponse(response);

      if (import.meta.env.DEV) {
        logger.log("✅ 활동 통계 조회 성공");
        console.log("📊 백엔드 응답 데이터:", JSON.stringify(result, null, 2));
        console.log("📊 주간 통계:", result.data.weekly_stats);
        console.log("📊 분기 통계:", result.data.quarterly_stats);
      }

      // snake_case를 camelCase로 변환
      const activityStats: ActivityStats = {
        weeklyStats: {
          callCount: result.data.weekly_stats.call_count,
          totalDurationMinutes: result.data.weekly_stats.total_duration_minutes,
          startDate: result.data.weekly_stats.start_date,
          endDate: result.data.weekly_stats.end_date,
        },
        quarterlyStats: {
          callCount: result.data.quarterly_stats.call_count,
          totalDurationMinutes:
            result.data.quarterly_stats.total_duration_minutes,
          startDate: result.data.quarterly_stats.start_date,
          endDate: result.data.quarterly_stats.end_date,
          quarter: result.data.quarterly_stats.quarter,
        },
        additionalStats: {
          averageCallDurationMinutes:
            result.data.additional_stats.average_call_duration_minutes,
          mostUsedCategory: result.data.additional_stats.most_used_category,
          totalDataUsageMb: result.data.additional_stats.total_data_usage_mb,
          averageNetworkQuality:
            result.data.additional_stats.average_network_quality,
        },
      };

      return activityStats;
    } catch (error) {
      logger.error("활동 통계 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("활동 통계 조회에 실패했습니다.");
    }
  }

  /**
   * 통화 이력 조회
   * GET /api/v1/users/me/call-history
   */
  async getCallHistory(params?: {
    page?: number;
    limit?: number;
    period?: "week" | "month" | "quarter" | "all";
  }): Promise<{
    calls: CallHistoryItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
    };
  }> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", String(params.page));
      if (params?.limit) queryParams.append("limit", String(params.limit));
      if (params?.period) queryParams.append("period", params.period);

      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/v1/users/me/call-history${queryString ? `?${queryString}` : ""}`;
      logger.apiRequest("GET", `/v1/users/me/call-history?${queryString}`, {});

      let response = await fetch(url, {
        method: "GET",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "GET",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: {
        data: {
          calls: Array<{
            call_id: string;
            partner_id: string;
            partner_nickname: string;
            category_id: number;
            category_name: string;
            started_at: string;
            ended_at: string;
            duration_minutes: number;
            average_network_quality?: number;
            total_data_usage_mb?: number;
          }>;
          pagination: {
            current_page: number;
            total_pages: number;
            total_count: number;
            has_next: boolean;
          };
        };
        message?: string;
        timestamp?: string;
      } = await handleApiResponse(response);

      if (import.meta.env.DEV) {
        logger.log("✅ 통화 이력 조회 성공");
      }

      // snake_case를 camelCase로 변환
      const callHistory = {
        calls: result.data.calls.map((call) => ({
          callId: call.call_id,
          partnerId: call.partner_id,
          partnerNickname: call.partner_nickname,
          categoryId: call.category_id,
          categoryName: call.category_name,
          startedAt: call.started_at,
          endedAt: call.ended_at,
          durationMinutes: call.duration_minutes,
          averageNetworkQuality: call.average_network_quality,
          totalDataUsageMB: call.total_data_usage_mb,
        })),
        pagination: {
          currentPage: result.data.pagination.current_page,
          totalPages: result.data.pagination.total_pages,
          totalCount: result.data.pagination.total_count,
          hasNext: result.data.pagination.has_next,
        },
      };

      return callHistory;
    } catch (error) {
      logger.error("통화 이력 조회 오류:", error);
      throw error instanceof Error
        ? error
        : new Error("통화 이력 조회에 실패했습니다.");
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

  /**
   * 친구 목록 조회
   * GET /api/v1/friendships
   */
  async getFriends(): Promise<Friend[]> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/friendships`;
      logger.apiRequest("GET", "/v1/friendships", {});
      if (import.meta.env.DEV) {
        console.log("🔍 친구 목록 요청 URL:", url);
        console.log("🔍 baseUrl:", this.baseUrl);
      }

      let response = await fetch(url, {
        method: "GET",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "GET",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: FriendsResponse =
        await handleApiResponse<FriendsResponse>(response);

      // API 응답을 Friend 타입으로 변환
      const friends: Friend[] = result.data.friends.map((friend: any) => {
        // 백엔드에서 반환하는 ID 필드명 확인 (friend_id, id, friendshipId, friendship_id 등)
        const friendId =
          friend.friend_id ||
          friend.id ||
          friend.friendshipId ||
          friend.friendship_id ||
          friend.user_id;

        if (import.meta.env.DEV && !friendId) {
          console.warn("⚠️ 친구 ID가 없습니다:", friend);
        }

        return {
          id: friendId,
          nickname: friend.nickname || friend.nick_name,
          lastCallAt:
            friend.last_call_at || friend.lastCallAt || friend.last_called_at,
          lastCallCategoryName:
            friend.last_call_category_name ||
            friend.lastCallCategoryName ||
            null,
        };
      });

      if (import.meta.env.DEV) {
        console.log("👥 친구 목록:", friends);
      }

      return friends;
    } catch (error) {
      logger.error("친구 목록 조회 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("친구 목록을 불러올 수 없습니다.");
    }
  }

  /**
   * 친구 요청 전송
   * POST /api/v1/friendships
   */
  async sendFriendRequest(
    request: SendFriendRequestRequest,
  ): Promise<SendFriendRequestResponse> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/friendships`;
      logger.apiRequest("POST", "/v1/friendships", request);

      let response = await fetch(url, {
        method: "POST",
        headers: createHeaders(this.token),
        credentials: "include",
        body: JSON.stringify(request),
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
            body: JSON.stringify(request),
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: SendFriendRequestResponse =
        await handleApiResponse<SendFriendRequestResponse>(response);

      if (import.meta.env.DEV) {
        console.log("✅ 친구 요청 전송 성공:", result);
      }

      return result;
    } catch (error) {
      logger.error("친구 요청 전송 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("친구 요청을 보낼 수 없습니다.");
    }
  }

  /**
   * 친구 요청 목록 조회 (나에게 온 요청들)
   * GET /api/v1/friendships/requests/received
   */
  async getFriendRequests(): Promise<FriendRequest[]> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/friendships/requests/received`;
      logger.apiRequest("GET", "/v1/friendships/requests/received", {});

      let response = await fetch(url, {
        method: "GET",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "GET",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: FriendRequestsResponse =
        await handleApiResponse<FriendRequestsResponse>(response);

      // API 응답을 FriendRequest 타입으로 변환
      const requests: FriendRequest[] = result.data.requests.map(
        (request: any) => ({
          id: request.id || request.friendship_id,
          requesterId: request.requester_id || request.requesterId,
          requesterNickname:
            request.requester_nickname || request.requesterNickname,
          receiverId: request.receiver_id || request.receiverId,
          receiverNickname:
            request.receiver_nickname || request.receiverNickname,
          status: request.status || "PENDING",
          createdAt: request.created_at || request.createdAt,
          updatedAt: request.updated_at || request.updatedAt,
        }),
      );

      if (import.meta.env.DEV) {
        console.log("📬 친구 요청 목록:", requests);
      }

      return requests;
    } catch (error) {
      logger.error("친구 요청 목록 조회 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("친구 요청 목록을 불러올 수 없습니다.");
    }
  }

  /**
   * 보낸 친구 요청 목록 조회 (내가 보낸 요청들)
   * GET /api/v1/friendships/requests/sent
   * 또는 현재 사용자 ID를 기준으로 필터링
   */
  async getSentFriendRequests(currentUserId: number): Promise<FriendRequest[]> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      // 먼저 보낸 요청 전용 엔드포인트를 시도
      let url = `${this.baseUrl}/v1/friendships/requests/sent`;
      logger.apiRequest("GET", "/v1/friendships/requests/sent", {});

      let response = await fetch(url, {
        method: "GET",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 404 에러면 보낸 요청 엔드포인트가 없다는 의미
      if (response.status === 404) {
        if (import.meta.env.DEV) {
          console.log("⚠️ 보낸 요청 전용 엔드포인트 없음");
        }
        // 빈 배열 반환 (보낸 요청을 가져올 수 없음)
        return [];
      }

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "GET",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: FriendRequestsResponse =
        await handleApiResponse<FriendRequestsResponse>(response);

      // API 응답을 FriendRequest 타입으로 변환
      // 보낸 요청의 경우: addressee_id, addressee_nickname 사용
      const requests: FriendRequest[] = result.data.requests.map(
        (request: any) => ({
          id: request.id || request.friendship_id,
          requesterId: currentUserId, // 보낸 요청이므로 현재 사용자가 요청자
          requesterNickname: "", // 보낸 요청에서는 요청자 닉네임이 필요 없음
          receiverId:
            request.addressee_id || request.receiver_id || request.receiverId,
          receiverNickname:
            request.addressee_nickname ||
            request.receiver_nickname ||
            request.receiverNickname ||
            "",
          status: request.status || "PENDING",
          createdAt:
            request.requested_at || request.created_at || request.createdAt,
          updatedAt:
            request.updated_at ||
            request.updatedAt ||
            request.requested_at ||
            request.created_at,
        }),
      );

      if (import.meta.env.DEV) {
        console.log("📤 보낸 친구 요청 목록:", requests);
      }

      return requests;
    } catch (error) {
      logger.error("보낸 친구 요청 목록 조회 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("보낸 친구 요청 목록을 불러올 수 없습니다.");
    }
  }

  /**
   * 친구 요청 수락
   * PUT /api/v1/friendships/{friendshipId}/accept
   */
  async acceptFriendRequest(
    friendshipId: number,
  ): Promise<FriendRequestActionResponse> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/friendships/${friendshipId}/accept`;
      logger.apiRequest("PUT", `/v1/friendships/${friendshipId}/accept`, {});

      let response = await fetch(url, {
        method: "PUT",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "PUT",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: FriendRequestActionResponse =
        await handleApiResponse<FriendRequestActionResponse>(response);

      if (import.meta.env.DEV) {
        console.log("✅ 친구 요청 수락 성공:", result);
      }

      return result;
    } catch (error) {
      logger.error("친구 요청 수락 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("친구 요청을 수락할 수 없습니다.");
    }
  }

  /**
   * 보낸 친구 요청 취소
   * DELETE /api/v1/friendships/requests/{friendshipId}
   */
  async cancelSentFriendRequest(
    friendshipId: number,
  ): Promise<FriendRequestActionResponse> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/friendships/requests/${friendshipId}`;
      logger.apiRequest(
        "DELETE",
        `/v1/friendships/requests/${friendshipId}`,
        {},
      );

      let response = await fetch(url, {
        method: "DELETE",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "DELETE",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: FriendRequestActionResponse =
        await handleApiResponse<FriendRequestActionResponse>(response);

      if (import.meta.env.DEV) {
        console.log("✅ 보낸 친구 요청 취소 성공:", result);
      }

      return result;
    } catch (error) {
      logger.error("보낸 친구 요청 취소 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("보낸 친구 요청을 취소할 수 없습니다.");
    }
  }

  /**
   * 친구 요청 거절
   * PUT /api/v1/friendships/{friendshipId}/reject
   */
  async rejectFriendRequest(
    friendshipId: number,
  ): Promise<FriendRequestActionResponse> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const url = `${this.baseUrl}/v1/friendships/${friendshipId}/reject`;
      logger.apiRequest("PUT", `/v1/friendships/${friendshipId}/reject`, {});

      let response = await fetch(url, {
        method: "PUT",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "PUT",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: FriendRequestActionResponse =
        await handleApiResponse<FriendRequestActionResponse>(response);

      if (import.meta.env.DEV) {
        console.log("✅ 친구 요청 거절 성공:", result);
      }

      return result;
    } catch (error) {
      logger.error("친구 요청 거절 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("친구 요청을 거절할 수 없습니다.");
    }
  }

  /**
   * 친구 삭제
   * DELETE /api/v1/friendships/{friendId}
   * 백엔드에서 Long 타입을 사용하므로 문자열로 변환하여 전달
   */
  async deleteFriend(friendId: number | string): Promise<DeleteFriendResponse> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      // friendId 유효성 검사
      if (friendId === undefined || friendId === null || friendId === "") {
        throw new Error("친구 ID가 유효하지 않습니다.");
      }

      // Long 타입 지원을 위해 명시적으로 문자열로 변환
      const friendIdStr = String(friendId);

      if (import.meta.env.DEV) {
        console.log("🗑️ 친구 삭제 API 호출:", {
          friendId,
          friendIdStr,
          url: `${this.baseUrl}/v1/friendships/${friendIdStr}`,
        });
      }

      const url = `${this.baseUrl}/v1/friendships/${friendIdStr}`;
      logger.apiRequest("DELETE", `/v1/friendships/${friendIdStr}`, {});

      let response = await fetch(url, {
        method: "DELETE",
        headers: createHeaders(this.token),
        credentials: "include",
      });

      // 401 에러 시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          this.token = newToken;
          response = await fetch(url, {
            method: "DELETE",
            headers: createHeaders(newToken),
            credentials: "include",
          });
        } else {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        }
      }

      const result: DeleteFriendResponse =
        await handleApiResponse<DeleteFriendResponse>(response);

      if (import.meta.env.DEV) {
        console.log("✅ 친구 삭제 성공:", result);
      }

      return result;
    } catch (error) {
      logger.error("친구 삭제 실패:", error);
      throw error instanceof Error
        ? error
        : new Error("친구를 삭제할 수 없습니다.");
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
