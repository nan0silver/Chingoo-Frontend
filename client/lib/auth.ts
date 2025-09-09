import {
  OAuthProvider,
  OAuthConfigResponse,
  OAuthLoginRequest,
  OAuthLoginResponse,
  ApiErrorResponse,
  UserInfo,
} from "@shared/api";

/**
 * API 설정
 */
// 백엔드 서버 포트를 실제 포트로 변경해주세요
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * OAuth 관련 상수
 */
const OAUTH_STORAGE_KEYS = {
  STATE: "oauth_state",
  CODE_VERIFIER: "oauth_code_verifier",
  PROVIDER: "oauth_provider",
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_INFO: "user_info",
} as const;

/**
 * OAuth 설정 정보를 가져오는 함수
 */
export const getOAuthConfig = async (
  provider: OAuthProvider,
): Promise<OAuthConfigResponse> => {
  try {
    const url = `${API_BASE_URL}/v1/auth/oauth/${provider}/config`;
    console.log("OAuth 설정 요청 URL:", url);

    const response = await fetch(url);

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

    console.log("OAuth 콜백 파라미터:", {
      code: code ? code.substring(0, 20) + "..." : null,
      state: state ? state.substring(0, 20) + "..." : null,
      error,
      currentUrl: window.location.href,
    });

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
    const provider = sessionStorage.getItem(
      OAUTH_STORAGE_KEYS.PROVIDER,
    ) as OAuthProvider;

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

    console.log("OAuth 로그인 요청 데이터:", {
      provider,
      code: code.substring(0, 20) + "...", // 코드는 일부만 로그
      state,
      code_verifier: codeVerifier.substring(0, 20) + "...", // code_verifier도 일부만 로그
      device_info: requestBody.device_info,
      code_length: code.length,
      state_length: state.length,
      code_verifier_length: codeVerifier.length,
    });

    const response = await fetch(`${API_BASE_URL}/v1/auth/oauth/${provider}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

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
        console.error("에러 응답 데이터:", errorData);

        // errors 배열이 있으면 상세 내용 출력
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.error("상세 에러 목록:", errorData.errors);
          errorData.errors.forEach((error, index) => {
            console.error(`에러 ${index + 1}:`, error);
          });
        }

        throw new Error(errorData.message || "로그인에 실패했습니다.");
      } else {
        const text = await response.text();
        console.error("예상치 못한 에러 응답:", text);
        throw new Error(`서버 에러: ${response.status} ${response.statusText}`);
      }
    }

    const result: OAuthLoginResponse = await response.json();

    // 토큰 저장
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.ACCESS_TOKEN,
      result.data.access_token,
    );
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.REFRESH_TOKEN,
      result.data.refresh_token,
    );
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify(result.data.user_info),
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
 */
export const getStoredToken = (): string | null => {
  return localStorage.getItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN);
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
 * 로그아웃 함수
 */
export const logout = (): void => {
  localStorage.removeItem(OAUTH_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(OAUTH_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(OAUTH_STORAGE_KEYS.USER_INFO);

  // 메인 페이지로 리다이렉트
  window.location.href = "/";
};

/**
 * 인증 상태를 확인하는 함수
 */
export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};

/**
 * 토큰 갱신 함수 (향후 구현 예정)
 */
export const refreshToken = async (): Promise<string | null> => {
  const refreshTokenValue = localStorage.getItem(
    OAUTH_STORAGE_KEYS.REFRESH_TOKEN,
  );

  if (!refreshTokenValue) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (!response.ok) {
      throw new Error("토큰 갱신에 실패했습니다.");
    }

    const result = await response.json();
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.ACCESS_TOKEN,
      result.data.access_token,
    );

    return result.data.access_token;
  } catch (error) {
    console.error("토큰 갱신 실패:", error);
    logout(); // 토큰 갱신 실패 시 로그아웃
    return null;
  }
};
