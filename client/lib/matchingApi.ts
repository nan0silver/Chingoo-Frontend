import {
  MatchingRequest,
  MatchingStatus,
  Category,
  MatchingResponse,
  CategoriesResponse,
} from "@shared/api";

/**
 * API 기본 설정
 */
const API_BASE_URL = "/api/v1";

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
    const errorData = await response
      .json()
      .catch(() => ({ message: "알 수 없는 오류가 발생했습니다." }));
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

    try {
      const response = await fetch(`${this.baseUrl}/calls/match`, {
        method: "POST",
        headers: createHeaders(this.token),
        body: JSON.stringify(request),
      });

      const result: ApiResponse<MatchingResponse> =
        await handleApiResponse(response);

      if (!result.success || !result.data) {
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
      const response = await fetch(`${this.baseUrl}/calls/match/status`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

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
  async cancelMatching(): Promise<void> {
    if (!this.token) {
      throw new Error("인증 토큰이 필요합니다.");
    }

    try {
      const response = await fetch(`${this.baseUrl}/calls/match`, {
        method: "DELETE",
        headers: createHeaders(this.token),
      });

      const result: ApiResponse<void> = await handleApiResponse(response);

      if (!result.success) {
        throw new Error(result.message || "매칭 취소에 실패했습니다.");
      }
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
      const response = await fetch(`${this.baseUrl}/categories/active`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

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
      const response = await fetch(`${this.baseUrl}/categories/${categoryId}`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

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
      const response = await fetch(
        `${this.baseUrl}/calls/match/queue/position`,
        {
          method: "GET",
          headers: createHeaders(this.token),
        },
      );

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
      const response = await fetch(`${this.baseUrl}/calls/match/stats`, {
        method: "GET",
        headers: createHeaders(this.token),
      });

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
}

// 싱글톤 인스턴스
export const matchingApiService = new MatchingApiService();
