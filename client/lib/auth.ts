import {
  OAuthProvider,
  OAuthConfigResponse,
  OAuthLoginRequest,
  OAuthLoginResponse,
  LogoutRequest,
  LogoutResponse,
  UserProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ApiErrorResponse,
  UserInfo,
} from "@shared/api";
import { logger } from "./logger";

/**
 * API 설정
 */
// 백엔드 서버 포트를 실제 포트로 변경해주세요
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
  : "/api"; // 개발/프로덕션 모두 상대 경로 사용 (프록시 또는 같은 도메인)

/**
 * 보안 설정 안내:
 *
 * 1. access_token: 메모리(in-memory)에만 저장 (XSS 공격 방어)
 *    - 페이지 새로고침 시 refresh token으로 자동 재발급
 *    - localStorage/sessionStorage에 저장하지 않음
 * 2. refresh_token: HttpOnly Secure SameSite=Strict 쿠키로 서버에서 설정 필요
 *    - XSS, CSRF 공격 방어
 *
 */

/**
 * 메모리 기반 토큰 저장소
 */
let inMemoryAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let isRefreshingToken = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * OAuth 관련 상수
 */
const OAUTH_STORAGE_KEYS = {
  STATE: "oauth_state",
  CODE_VERIFIER: "oauth_code_verifier",
  PROVIDER: "oauth_provider",
  USER_INFO: "user_info",
} as const;

/**
 * 메모리에 access token 저장
 */
const setInMemoryToken = (token: string, expiresIn?: number): void => {
  inMemoryAccessToken = token;

  if (expiresIn) {
    const skewed = Math.max(0, expiresIn - 30); // 30초 여유
    tokenExpiresAt = Date.now() + skewed * 1000;
  }

  logger.log("💾 Access token을 메모리에 저장 완료");
};

/**
 * 메모리에서 access token 가져오기
 */
const getInMemoryToken = (): string | null => {
  return inMemoryAccessToken;
};

/**
 * 메모리에서 access token 삭제
 */
const clearInMemoryToken = (): void => {
  inMemoryAccessToken = null;
  tokenExpiresAt = null;
  logger.log("🗑️ 메모리에서 access token 삭제 완료");
};

/**
 * 토큰 만료 여부 확인
 */
const isTokenExpired = (): boolean => {
  if (!tokenExpiresAt) return true;
  return Date.now() >= tokenExpiresAt;
};

/**
 * refresh 구독자 추가 (여러 요청이 동시에 refresh를 시도할 때 중복 방지)
 */
const subscribeTokenRefresh = (callback: (token: string) => void): void => {
  refreshSubscribers.push(callback);
};

/**
 * refresh 구독자들에게 새 토큰 전달
 */
const onTokenRefreshed = (token: string): void => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * OAuth 설정 정보를 가져오는 함수
 */
export const getOAuthConfig = async (
  provider: OAuthProvider,
): Promise<OAuthConfigResponse> => {
  try {
    const url = `${API_BASE_URL}/v1/auth/oauth/${provider}/config`;
    logger.apiRequest("GET", `/v1/auth/oauth/${provider}/config`);

    const controller = new AbortController();
    // 타임아웃을 30초로 증가 (임시 조치 - 백엔드 최적화 필요)
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      // 응답이 JSON이 아닌 경우를 처리
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(
          errorData.message || "OAuth 설정을 가져오는데 실패했습니다.",
        );
      } else {
        const text = await response.text();
        logger.error("예상치 못한 응답:", text);
        throw new Error(
          `서버에서 예상치 못한 응답을 받았습니다. (${response.status})`,
        );
      }
    }

    return await response.json();
  } catch (error) {
    logger.error("OAuth 설정 가져오기 실패:", error);
    throw error;
  }
};

/**
 * 소셜 로그인을 시작하는 함수
 */
export const startSocialLogin = async (
  provider: OAuthProvider,
): Promise<void> => {
  try {
    const config = await getOAuthConfig(provider);

    // 보안을 위해 state와 code_verifier를 sessionStorage에 저장
    sessionStorage.setItem(OAUTH_STORAGE_KEYS.STATE, config.data.state);
    sessionStorage.setItem(
      OAUTH_STORAGE_KEYS.CODE_VERIFIER,
      config.data.code_verifier, // code_challenge가 아닌 code_verifier 사용
    );
    sessionStorage.setItem(OAUTH_STORAGE_KEYS.PROVIDER, provider);

    // 소셜 로그인 페이지로 리다이렉트
    logger.log("소셜 로그인 리다이렉트 시작:", provider);
    window.location.href = config.data.authorization_url;
  } catch (error) {
    logger.error("소셜 로그인 시작 실패:", error);
    throw error;
  }
};

/**
 * OAuth 콜백에서 인가 코드를 처리하는 함수
 */
export const processOAuthCallback =
  async (): Promise<OAuthLoginResponse | null> => {
    // URL 파라미터를 안전하게 처리
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    logger.log("OAuth 콜백 파라미터:", {
      code_length: code?.length ?? 0,
      state_length: state?.length ?? 0,
      has_error: !!error,
    });

    // 에러가 있는 경우
    if (error) {
      logger.error("OAuth 에러:", error);
      throw new Error(`OAuth 인증 중 오류가 발생했습니다: ${error}`);
    }

    // code와 state가 없는 경우
    if (!code || !state) {
      return null;
    }

    // 저장된 값들과 비교하여 보안 검증
    const savedState = sessionStorage.getItem(OAUTH_STORAGE_KEYS.STATE);
    const codeVerifier = sessionStorage.getItem(
      OAUTH_STORAGE_KEYS.CODE_VERIFIER,
    );
    const providerStr = sessionStorage.getItem(OAUTH_STORAGE_KEYS.PROVIDER);
    const provider = (["google", "kakao", "naver"] as const).find(
      (p) => p === providerStr,
    );

    if (!provider) {
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.PROVIDER);
      throw new Error("지원하지 않는 OAuth 공급자입니다. 다시 로그인해주세요.");
    }

    if (!savedState || !codeVerifier || !provider) {
      throw new Error("OAuth 세션 정보가 없습니다. 다시 로그인해주세요.");
    }

    if (state !== savedState) {
      throw new Error(
        "OAuth state 검증에 실패했습니다. 보안상 다시 로그인해주세요.",
      );
    }

    return await processSocialLogin(provider, code, state, codeVerifier);
  };

/**
 * 백엔드로 인가 코드를 전송하고 토큰을 받는 함수
 */
export const processSocialLogin = async (
  provider: OAuthProvider,
  code: string,
  state: string,
  codeVerifier: string,
): Promise<OAuthLoginResponse> => {
  try {
    const requestBody: OAuthLoginRequest = {
      code,
      state,
      code_verifier: codeVerifier,
      device_info: `${navigator.platform} - ${navigator.userAgent.split(" ")[0]}`,
    };

    logger.log("📤 전송할 데이터:", {
      provider,
      code_length: code?.length || 0,
      state_length: state?.length || 0,
      code_verifier_length: codeVerifier?.length || 0,
      device_info_length: requestBody.device_info?.length || 0,
    });

    const controller = new AbortController();
    // 타임아웃을 60초로 증가 (디버깅용)
    const timeoutId = setTimeout(() => {
      logger.error("⏰ OAuth 요청 타임아웃 (60초 초과)");
      controller.abort();
    }, 60000);

    const startTime = Date.now();
    logger.apiRequest("POST", `/v1/auth/oauth/${provider}`);

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/v1/auth/oauth/${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });

      const elapsedTime = Date.now() - startTime;
      logger.log(`✅ OAuth 로그인 요청 완료: ${elapsedTime}ms`);
    } catch (fetchError) {
      const elapsedTime = Date.now() - startTime;
      logger.error(`❌ OAuth 로그인 요청 실패: ${elapsedTime}ms`, fetchError);
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      logger.error("OAuth 로그인 응답 에러:", {
        status: response.status,
        statusText: response.statusText,
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        logger.error("❌ 백엔드 에러 응답:", errorData);

        // 백엔드 팀을 위한 상세 정보
        logger.debugGroup("백엔드 디버깅 정보", {
          provider,
          error_code: errorData.code,
          error_message: errorData.message,
          timestamp: errorData.timestamp,
          status: response.status,
          errors: errorData.errors || [],
        });

        throw new Error(errorData.message || "로그인에 실패했습니다.");
      } else {
        const text = await response.text();
        logger.error("예상치 못한 에러 응답:", text);
        throw new Error(`서버 에러: ${response.status} ${response.statusText}`);
      }
    }

    const result: OAuthLoginResponse = await response.json();

    // 토큰 저장
    // access_token은 메모리에만 저장 (XSS 공격 방어)
    setInMemoryToken(result.data.access_token, result.data.expires_in);
    // refresh_token은 서버에서 HttpOnly 쿠키로 설정됨
    // 프론트엔드에서는 저장하지 않음

    // PII 보안: 최소한의 정보만 저장 (이메일, 닉네임 제외)
    const minimalUserInfo: UserInfo = {
      id: result.data.user_info.id,
      is_new_user: result.data.user_info.is_new_user,
      is_profile_complete: result.data.user_info.is_profile_complete,
    };
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify(minimalUserInfo),
    );

    // sessionStorage 정리
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.PROVIDER);

    return result;
  } catch (error) {
    logger.error("소셜 로그인 처리 실패:", error);
    throw error;
  }
};

/**
 * 저장된 토큰을 가져오는 함수
 * access_token: 메모리에서 조회
 * refresh_token: HttpOnly 쿠키에서 조회 (서버에서 설정됨)
 */
export const getStoredToken = (
  tokenType: "access_token" | "refresh_token" = "access_token",
): string | null => {
  if (tokenType === "access_token") {
    return getInMemoryToken();
  } else {
    // refresh_token은 HttpOnly 쿠키로 서버에서 관리되므로
    // 프론트엔드에서는 직접 접근할 수 없음
    // 서버 API 호출 시 자동으로 쿠키가 전송됨
    return null;
  }
};

/**
 * 저장된 사용자 정보를 가져오는 함수
 */
export const getStoredUserInfo = (): UserInfo | null => {
  const userInfoStr = localStorage.getItem(OAUTH_STORAGE_KEYS.USER_INFO);
  if (!userInfoStr) return null;

  try {
    return JSON.parse(userInfoStr);
  } catch (error) {
    logger.error("사용자 정보 파싱 실패:", error);
    return null;
  }
};

/**
 * 서버에 로그아웃 요청을 보내는 함수
 */
export const logoutFromServer = async (): Promise<void> => {
  try {
    const accessToken = getStoredToken("access_token");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`; // ✅ 실제 토큰 사용
    }

    // refresh_token은 HttpOnly 쿠키로 자동 전송됨
    // logout_all: true로 모든 세션에서 로그아웃
    const requestBody = {
      logout_all: true,
    };

    logger.apiRequest("POST", "/v1/auth/logout", requestBody);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/v1/auth/logout`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        logger.error("로그아웃 API 오류:", errorData);
        throw new Error(
          `로그아웃 실패: ${errorData.message || response.statusText}`,
        );
      } else {
        const text = await response.text();
        logger.error("로그아웃 API 오류(텍스트):", text);
        throw new Error(
          `로그아웃 실패: ${response.status} ${response.statusText}`,
        );
      }
    }

    const data: LogoutResponse = await response.json();
    logger.apiResponse("POST", "/v1/auth/logout", response.status, data);
  } catch (error) {
    logger.error("서버 로그아웃 중 오류 발생:", error);
    // 서버 로그아웃이 실패해도 로컬 로그아웃은 진행
    throw error;
  }
};

/**
 * 로그아웃 함수 (서버 API 호출 + 로컬 정리)
 */
export const logout = async (): Promise<void> => {
  try {
    // 서버에 로그아웃 요청
    await logoutFromServer();
  } catch (error) {
    logger.error("서버 로그아웃 실패, 로컬 로그아웃만 진행:", error);
  } finally {
    // 서버 로그아웃 성공/실패와 관계없이 로컬 정리는 항상 수행
    try {
      // 토큰과 사용자 정보 삭제
      clearInMemoryToken(); // 메모리에서 access token 삭제
      // refresh_token은 HttpOnly 쿠키로 서버에서 관리되므로 프론트엔드에서 삭제 불가
      localStorage.removeItem(OAUTH_STORAGE_KEYS.USER_INFO);

      // 세션 스토리지도 정리 (OAuth 임시 데이터)
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.PROVIDER);

      logger.log("로컬 로그아웃 완료");
    } catch (error) {
      logger.error("로컬 로그아웃 중 오류 발생:", error);
    }
  }
};

/**
 * 인증 상태를 확인하는 함수
 * 메모리에 토큰이 있으면 인증된 것으로 간주
 * (토큰 만료 시 API 호출 시점에 자동으로 갱신됨)
 */
export const isAuthenticated = (): boolean => {
  const token = getInMemoryToken();

  if (!token) {
    logger.log("인증 상태: 토큰 없음");
    return false;
  }

  logger.log("인증 상태: 토큰 존재");
  return true;
};

/**
 * 사용자 프로필 정보를 가져오는 함수
 */
export const getUserProfile = async (): Promise<UserProfileResponse> => {
  try {
    const accessToken = getStoredToken("access_token");

    if (!accessToken) {
      throw new Error("액세스 토큰이 없습니다.");
    }

    logger.apiRequest("GET", "/v1/auth/me");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include", // 쿠키를 포함하여 요청
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      logger.log("🔑 프로필 조회에서 401 에러 발생, 토큰 갱신 시도 중...");
      const newToken = await refreshToken();
      if (newToken) {
        logger.log("✅ 토큰 갱신 성공, 새 토큰으로 재시도 중...");
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include", // 쿠키를 포함하여 요청
          signal: controller2.signal,
        });
        clearTimeout(timeoutId2);
        logger.log(`🔄 토큰 갱신 후 재시도 결과: ${response.status}`);
      } else {
        logger.error("❌ 토큰 갱신 실패");
        // 토큰 갱신 실패 시 인증 오류로 처리
        throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        logger.error("프로필 조회 API 오류:", errorData);
        throw new Error(
          `프로필 조회 실패: ${errorData.message || response.statusText}`,
        );
      } else {
        const text = await response.text();
        logger.error("프로필 조회 API 오류(텍스트):", text);
        throw new Error(
          `프로필 조회 실패: ${response.status} ${response.statusText}`,
        );
      }
    }

    const data: UserProfileResponse = await response.json();
    logger.apiResponse("GET", "/v1/auth/me", response.status, data);

    return data;
  } catch (error) {
    logger.error("사용자 프로필 조회 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 사용자 프로필을 업데이트하는 함수
 */
export const updateUserProfile = async (
  profileData: UpdateProfileRequest,
): Promise<UpdateProfileResponse> => {
  try {
    const accessToken = getStoredToken("access_token");

    if (!accessToken) {
      throw new Error("액세스 토큰이 없습니다.");
    }

    const requestBody: UpdateProfileRequest = profileData;

    logger.apiRequest("PUT", "/v1/users/profile", requestBody);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let response = await fetch(`${API_BASE_URL}/v1/users/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      credentials: "include", // 쿠키를 포함하여 요청
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      logger.log("🔑 프로필 업데이트에서 401 에러 발생, 토큰 갱신 시도 중...");
      const newToken = await refreshToken();
      if (newToken) {
        logger.log("✅ 토큰 갱신 성공, 새 토큰으로 재시도 중...");
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        response = await fetch(`${API_BASE_URL}/v1/users/profile`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          credentials: "include", // 쿠키를 포함하여 요청
          signal: controller2.signal,
        });
        clearTimeout(timeoutId2);
        logger.log(`🔄 토큰 갱신 후 재시도 결과: ${response.status}`);
      } else {
        logger.error("❌ 토큰 갱신 실패");
        // 토큰 갱신 실패 시 인증 오류로 처리
        throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        logger.error("프로필 업데이트 API 오류:", errorData);
        throw new Error(
          `프로필 업데이트 실패: ${errorData.message || response.statusText}`,
        );
      } else {
        const text = await response.text();
        logger.error("프로필 업데이트 API 오류(텍스트):", text);
        throw new Error(
          `프로필 업데이트 실패: ${response.status} ${response.statusText}`,
        );
      }
    }

    const data: UpdateProfileResponse = await response.json();
    logger.apiResponse("PUT", "/v1/users/profile", response.status, data);

    return data;
  } catch (error) {
    logger.error("프로필 업데이트 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 앱 초기화 시 토큰을 로드하는 함수
 * refresh token(쿠키)을 사용하여 access token을 발급받아 메모리에 저장
 */
export const initializeAuth = async (): Promise<boolean> => {
  try {
    logger.log("🚀 앱 초기화: 인증 상태 확인...");

    // 이미 메모리에 토큰이 있으면 스킵
    if (getInMemoryToken()) {
      logger.log("✅ 메모리에 토큰이 이미 존재 - 초기화 스킵");
      return true;
    }

    // refresh token으로 새 access token 발급
    const token = await refreshToken();

    if (token) {
      logger.log("✅ 앱 초기화 성공: 토큰 발급 완료");
      return true;
    } else {
      logger.log("ℹ️ 앱 초기화: 저장된 refresh token 없음 (로그인 필요)");
      return false;
    }
  } catch (error) {
    logger.error("❌ 앱 초기화 실패:", error);
    return false;
  }
};

/**
 * 토큰 갱신 함수
 * 네트워크 타임아웃과 실패 시 적절한 처리 포함
 */
export const refreshToken = async (): Promise<string | null> => {
  // 이미 갱신 중이면 기존 요청이 완료될 때까지 대기
  if (isRefreshingToken) {
    logger.log("🔄 이미 토큰 갱신 중 - 대기...");
    return new Promise((resolve) => {
      subscribeTokenRefresh((token: string) => {
        resolve(token);
      });
    });
  }

  try {
    isRefreshingToken = true;
    logger.log("🔄 토큰 갱신 시작...");

    // 네트워크 타임아웃 설정 (10초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      logger.apiRequest("POST", "/v1/auth/refresh");
      response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: "" }), // 서버에서 쿠키의 refresh_token을 사용
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });
      logger.log(`📡 토큰 갱신 API 응답 상태: ${response.status}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401) {
        logger.warn("❌ 리프레시 토큰이 만료되었습니다.");
        clearInMemoryToken(); // 메모리 토큰 삭제
        isRefreshingToken = false;
        onTokenRefreshed(""); // 대기 중인 요청들에게 알림
        return null;
      }
      logger.error(
        `❌ 토큰 갱신 실패: ${response.status} ${response.statusText}`,
      );
      throw new Error(`토큰 갱신 실패: ${response.status}`);
    }

    const result = await response.json();
    logger.log("📦 토큰 갱신 응답 데이터:", result);

    // 새로운 access_token을 메모리에 저장
    setInMemoryToken(result.data.access_token, result.data.expires_in);
    logger.log("💾 새로운 access_token 메모리 저장 완료");

    logger.log("✅ 토큰 갱신 성공");

    // 대기 중인 다른 요청들에게 새 토큰 전달
    isRefreshingToken = false;
    onTokenRefreshed(result.data.access_token);

    return result.data.access_token;
  } catch (error) {
    isRefreshingToken = false;
    onTokenRefreshed(""); // 실패를 알림

    if (error instanceof Error && error.name === "AbortError") {
      logger.error("⏰ 토큰 갱신 타임아웃:", error);
    } else {
      logger.error("❌ 토큰 갱신 실패:", error);
    }

    // 실패 시 메모리 토큰 삭제
    clearInMemoryToken();

    return null;
  }
};

/**
 * 인증이 필요한 API 호출을 위한 fetch 래퍼 함수
 * - 자동으로 메모리에서 access token을 가져와 헤더에 추가
 * - 401 에러 시 자동으로 토큰 갱신 후 재시도 (1회만)
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  // 첫 번째 시도
  const token = getInMemoryToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // 쿠키 포함 (refresh token용)
  };

  let response = await fetch(url, requestOptions);

  // 401 에러 시 토큰 갱신 후 재시도
  if (response.status === 401) {
    logger.log("🔐 401 에러 발생 - 토큰 갱신 시도...");

    const newToken = await refreshToken();

    if (!newToken) {
      logger.error("❌ 토큰 갱신 실패 - 로그인 필요");
      return response; // 원래 401 응답 반환
    }

    // 새 토큰으로 재시도
    logger.log("🔄 새 토큰으로 요청 재시도...");
    headers.set("Authorization", `Bearer ${newToken}`);

    const retryOptions: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    response = await fetch(url, retryOptions);

    if (response.ok) {
      logger.log("✅ 토큰 갱신 후 요청 성공");
    }
  }

  return response;
};
