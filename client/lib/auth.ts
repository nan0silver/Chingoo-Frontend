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
 * 1. access_token: sessionStorage에 저장 (XSS 보호)
 * 2. refresh_token: HttpOnly Secure SameSite=Strict 쿠키로 서버에서 설정 필요
 *
 */

/**
 * OAuth 관련 상수
 */
const OAUTH_STORAGE_KEYS = {
  STATE: "oauth_state",
  CODE_VERIFIER: "oauth_code_verifier",
  PROVIDER: "oauth_provider",
  ACCESS_TOKEN: "access_token",
  USER_INFO: "user_info",
  ACCESS_TOKEN_EXPIRES_AT: "access_token_expires_at",
} as const;

/**
 * OAuth 설정 정보를 가져오는 함수
 */
export const getOAuthConfig = async (
  provider: OAuthProvider,
): Promise<OAuthConfigResponse> => {
  try {
    const url = `${API_BASE_URL}/v1/auth/oauth/${provider}/config`;
    if (import.meta.env.DEV) {
      console.log("OAuth 설정 요청 URL:", url);
    }

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
        console.error("예상치 못한 응답:", text);
        throw new Error(
          `서버에서 예상치 못한 응답을 받았습니다. (${response.status})`,
        );
      }
    }

    return await response.json();
  } catch (error) {
    console.error("OAuth 설정 가져오기 실패:", error);
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
    window.location.href = config.data.authorization_url;
  } catch (error) {
    console.error("소셜 로그인 시작 실패:", error);
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

    if (import.meta.env.DEV) {
      console.log("OAuth 콜백 파라미터(DEV):", {
        code_length: code?.length ?? 0,
        state_length: state?.length ?? 0,
        error,
      });
    }

    // 에러가 있는 경우
    if (error) {
      console.error("OAuth 에러:", error);
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

    // ✅ 실제 전송 데이터 확인
    console.log("📤 전송할 데이터:", {
      provider,
      code_length: code?.length || 0,
      state_length: state?.length || 0,
      code_verifier_length: codeVerifier?.length || 0,
      device_info_length: requestBody.device_info?.length || 0,
    });

    // ✅ 실제 값 일부만 출력 (보안상 전체는 출력 안함)
    console.log("📤 실제 값 샘플:", {
      code_sample: code?.substring(0, 20) + "...",
      state_sample: state?.substring(0, 20) + "...",
      code_verifier_sample: codeVerifier?.substring(0, 20) + "...",
      device_info: requestBody.device_info,
    });

    const controller = new AbortController();
    // 타임아웃을 60초로 증가 (디버깅용)
    const timeoutId = setTimeout(() => {
      console.error("⏰ OAuth 요청 타임아웃 (60초 초과)");
      controller.abort();
    }, 60000);

    const startTime = Date.now();
    console.log("📡 OAuth 로그인 요청 시작:", {
      provider,
      url: `${API_BASE_URL}/v1/auth/oauth/${provider}`,
      timestamp: new Date().toISOString(),
    });

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
      console.log(`✅ OAuth 로그인 요청 완료: ${elapsedTime}ms`);
    } catch (fetchError) {
      const elapsedTime = Date.now() - startTime;
      console.error(`❌ OAuth 로그인 요청 실패: ${elapsedTime}ms`, fetchError);
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error("OAuth 로그인 응답 에러:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        console.error("❌ 백엔드 에러 응답:", errorData);

        // 백엔드 팀을 위한 상세 정보
        console.group("🔍 백엔드 디버깅 정보");
        console.log("Provider:", provider);
        console.log("Error Code:", errorData.code);
        console.log("Error Message:", errorData.message);
        console.log("Timestamp:", errorData.timestamp);
        console.log("Request URL:", response.url);
        console.log("Status:", response.status);

        // errors 배열이 있으면 상세 내용 출력
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.log("상세 에러 목록:", errorData.errors);
          errorData.errors.forEach((error, index) => {
            console.log(`  에러 ${index + 1}:`, error);
          });
        }
        console.groupEnd();

        throw new Error(errorData.message || "로그인에 실패했습니다.");
      } else {
        const text = await response.text();
        console.error("예상치 못한 에러 응답:", text);
        throw new Error(`서버 에러: ${response.status} ${response.statusText}`);
      }
    }

    const result: OAuthLoginResponse = await response.json();

    // 토큰 저장
    // access_token은 sessionStorage에 저장 (XSS 보호)
    sessionStorage.setItem(
      OAUTH_STORAGE_KEYS.ACCESS_TOKEN,
      result.data.access_token,
    );
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

    const skewed = Math.max(0, (result.data.expires_in ?? 0) - 30);
    const expiresAt = Date.now() + skewed * 1000;
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT,
      String(expiresAt),
    );

    // sessionStorage 정리
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.PROVIDER);

    return result;
  } catch (error) {
    console.error("소셜 로그인 처리 실패:", error);
    throw error;
  }
};

/**
 * 저장된 토큰을 가져오는 함수
 * access_token: sessionStorage에서 조회
 * refresh_token: HttpOnly 쿠키에서 조회 (서버에서 설정됨)
 */
export const getStoredToken = (
  tokenType: "access_token" | "refresh_token" = "access_token",
): string | null => {
  if (tokenType === "access_token") {
    return sessionStorage.getItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN);
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
    console.error("사용자 정보 파싱 실패:", error);
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
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // refresh_token은 HttpOnly 쿠키로 자동 전송됨
    // logout_all: true로 모든 세션에서 로그아웃
    const requestBody = {
      logout_all: true,
    };

    if (import.meta.env.DEV) {
      console.log("로그아웃 요청 데이터:", requestBody);
    }

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
        console.error("로그아웃 API 오류:", errorData);
        throw new Error(
          `로그아웃 실패: ${errorData.message || response.statusText}`,
        );
      } else {
        const text = await response.text();
        console.error("로그아웃 API 오류(텍스트):", text);
        throw new Error(
          `로그아웃 실패: ${response.status} ${response.statusText}`,
        );
      }
    }

    const data: LogoutResponse = await response.json();

    if (import.meta.env.DEV) {
      console.log("로그아웃 성공(DEV):", data);
    }
  } catch (error) {
    console.error("서버 로그아웃 중 오류 발생:", error);
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
    console.error("서버 로그아웃 실패, 로컬 로그아웃만 진행:", error);
  } finally {
    // 서버 로그아웃 성공/실패와 관계없이 로컬 정리는 항상 수행
    try {
      // 토큰과 사용자 정보 삭제
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN);
      // refresh_token은 HttpOnly 쿠키로 서버에서 관리되므로 프론트엔드에서 삭제 불가
      localStorage.removeItem(OAUTH_STORAGE_KEYS.USER_INFO);
      localStorage.removeItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT);

      // 세션 스토리지도 정리
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.PROVIDER);

      if (import.meta.env.DEV) console.log("로컬 로그아웃 완료");
    } catch (error) {
      console.error("로컬 로그아웃 중 오류 발생:", error);
    }
  }
};

/**
 * 인증 상태를 확인하는 함수
 * 토큰 존재 여부와 만료 시간을 모두 확인
 */
export const isAuthenticated = (): boolean => {
  const token = getStoredToken();
  if (!token) {
    if (import.meta.env.DEV) console.log("인증 상태: 토큰 없음");
    return false;
  }

  const expStr = localStorage.getItem(
    OAUTH_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT,
  );

  // expires_at이 없으면 토큰이 있다고 가정 (하위 호환성)
  if (!expStr) {
    if (import.meta.env.DEV)
      console.log("인증 상태: 토큰 있음, 만료 시간 정보 없음");
    return true;
  }

  const now = Date.now();
  const expiresAt = Number(expStr);
  const valid = now < expiresAt;

  if (!valid) {
    if (import.meta.env.DEV)
      console.log("인증 상태: 토큰 만료됨 (하지만 토큰 갱신 가능)");
    // 토큰이 만료되었어도 refresh_token으로 갱신 가능하므로 true 반환
    // 실제 API 호출 시에 401 에러가 발생하면 그때 토큰 갱신을 시도함
    return true;
  } else {
    if (import.meta.env.DEV) console.log("인증 상태: 유효한 토큰");
  }

  return valid;
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
      console.log("🔑 프로필 조회에서 401 에러 발생, 토큰 갱신 시도 중...");
      const newToken = await refreshToken();
      if (newToken) {
        console.log("✅ 토큰 갱신 성공, 새 토큰으로 재시도 중...");
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
        console.log(`🔄 토큰 갱신 후 재시도 결과: ${response.status}`);
      } else {
        console.error("❌ 토큰 갱신 실패");
        // 토큰 갱신 실패 시 인증 오류로 처리
        throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        console.error("프로필 조회 API 오류:", errorData);
        throw new Error(
          `프로필 조회 실패: ${errorData.message || response.statusText}`,
        );
      } else {
        const text = await response.text();
        console.error("프로필 조회 API 오류(텍스트):", text);
        throw new Error(
          `프로필 조회 실패: ${response.status} ${response.statusText}`,
        );
      }
    }

    const data: UserProfileResponse = await response.json();
    if (import.meta.env.DEV) {
      console.log("사용자 프로필 조회 성공(DEV):", data);
    }

    return data;
  } catch (error) {
    console.error("사용자 프로필 조회 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 사용자 프로필을 업데이트하는 함수
 */
export const updateUserProfile = async (
  nickname: string,
): Promise<UpdateProfileResponse> => {
  try {
    const accessToken = getStoredToken("access_token");

    if (!accessToken) {
      throw new Error("액세스 토큰이 없습니다.");
    }

    const requestBody: UpdateProfileRequest = {
      nickname: nickname,
    };

    if (import.meta.env.DEV) {
      console.log("프로필 업데이트 요청 데이터:", requestBody);
    }

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
      console.log("🔑 프로필 업데이트에서 401 에러 발생, 토큰 갱신 시도 중...");
      const newToken = await refreshToken();
      if (newToken) {
        console.log("✅ 토큰 갱신 성공, 새 토큰으로 재시도 중...");
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
        console.log(`🔄 토큰 갱신 후 재시도 결과: ${response.status}`);
      } else {
        console.error("❌ 토큰 갱신 실패");
        // 토큰 갱신 실패 시 인증 오류로 처리
        throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        console.error("프로필 업데이트 API 오류:", errorData);
        throw new Error(
          `프로필 업데이트 실패: ${errorData.message || response.statusText}`,
        );
      } else {
        const text = await response.text();
        console.error("프로필 업데이트 API 오류(텍스트):", text);
        throw new Error(
          `프로필 업데이트 실패: ${response.status} ${response.statusText}`,
        );
      }
    }

    const data: UpdateProfileResponse = await response.json();
    if (import.meta.env.DEV) {
      console.log("프로필 업데이트 성공(DEV):", data);
    }

    return data;
  } catch (error) {
    console.error("프로필 업데이트 중 오류 발생:", error);
    throw error;
  }
};

/**
 * 토큰 갱신 함수
 * 네트워크 타임아웃과 실패 시 적절한 처리 포함
 */
export const refreshToken = async (): Promise<string | null> => {
  try {
    console.log("🔄 토큰 갱신 시작...");
    // 네트워크 타임아웃 설정 (10초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    // refresh_token은 HttpOnly 쿠키로 자동 전송됨
    let response: Response;
    try {
      console.log(`📡 토큰 갱신 API 호출: ${API_BASE_URL}/v1/auth/refresh`);
      response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: "" }), // 서버에서 쿠키의 refresh_token을 사용
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });
      console.log(`📡 토큰 갱신 API 응답 상태: ${response.status}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401) {
        console.warn("❌ 리프레시 토큰이 만료되었습니다.");
        return null; // 상위에서 UX 처리하도록 null 반환
      }
      console.error(
        `❌ 토큰 갱신 실패: ${response.status} ${response.statusText}`,
      );
      throw new Error(`토큰 갱신 실패: ${response.status}`);
    }

    const result = await response.json();
    console.log("📦 토큰 갱신 응답 데이터:", result);

    // 새로운 access_token을 sessionStorage에 저장
    sessionStorage.setItem(
      OAUTH_STORAGE_KEYS.ACCESS_TOKEN,
      result.data.access_token,
    );
    console.log("💾 새로운 access_token 저장 완료");

    // expires_at 업데이트 (새 토큰의 만료 시간 설정)
    if (typeof result.data.expires_in === "number") {
      const skewed = Math.max(0, result.data.expires_in - 30); // 30초 여유
      const expiresAt = Date.now() + skewed * 1000;
      localStorage.setItem(
        OAUTH_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT,
        String(expiresAt),
      );
      console.log(
        `⏰ 토큰 만료 시간 설정: ${new Date(expiresAt).toLocaleString()}`,
      );
    }

    if (import.meta.env.DEV) {
      console.log("✅ 토큰 갱신 성공(DEV)");
    }

    return result.data.access_token;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("⏰ 토큰 갱신 타임아웃:", error);
    } else {
      console.error("❌ 토큰 갱신 실패:", error);
    }

    // 실패 시 즉시 로그아웃하지 않고 null 반환
    // 상위에서 UX 처리하도록 함
    return null;
  }
};
