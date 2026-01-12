import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { KakaoLoginPlugin } from "capacitor-kakao-login-plugin";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
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
  LoginRequest,
  LoginResponse,
  SignUpRequest,
  SignUpResponse,
} from "@shared/api";
import { logger } from "./logger";

// Window 타입 확장
declare global {
  interface Window {
    oauthDeepLinkListenerRegistered?: boolean;
  }
}

/**
 * API 설정 - 동적으로 URL을 가져오는 함수
 */
export const getApiUrl = (): string => {
  // 네이티브 앱이면 무조건 운영 서버
  if (import.meta.env.DEV) {
    console.log("🔍 현재 URL:", window.location.href);
    console.log("🔍 현재 Origin:", window.location.origin);
    console.log("🔍 Capacitor Native:", Capacitor.isNativePlatform());
  }

  if (Capacitor.isNativePlatform()) {
    if (import.meta.env.DEV) {
      console.log("✅ 네이티브 앱 - 운영 서버 사용");
    }
    return "https://silverld.site/api";
  }

  // 웹에서는 환경변수 사용
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    if (import.meta.env.DEV) {
      console.log("✅ 웹 - 환경변수 사용:", envUrl);
    }
    return String(envUrl).replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    console.log("✅ 웹 개발 - 프록시 사용");
  }
  return "/api";
};

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
 * 회원가입 함수
 */
export const signup = async (
  signUpData: SignUpRequest,
): Promise<SignUpResponse> => {
  try {
    const requestBody: SignUpRequest = {
      email: signUpData.email.trim(),
      password: signUpData.password,
      real_name: signUpData.real_name.trim(),
    };

    logger.apiRequest("POST", "/v1/auth/signup");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch(`${getApiUrl()}/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // 응답 본문을 텍스트로 먼저 읽기
    const responseText = await response.text();

    if (!response.ok) {
      logger.error("회원가입 응답 에러:", {
        status: response.status,
        statusText: response.statusText,
      });

      let errorMessage = "회원가입에 실패했습니다.";

      try {
        // JSON 파싱 시도
        const errorData: ApiErrorResponse = JSON.parse(responseText);
        logger.error("❌ 백엔드 에러 응답:", errorData);

        errorMessage = errorData.message || errorMessage;

        // 필드별 에러가 있는 경우
        if (errorData.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors
            .map((err) => err.message)
            .join(", ");
          errorMessage = errorMessages || errorMessage;
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 원본 텍스트 표시
        logger.error("에러 응답 파싱 실패:", parseError);
        logger.error("원본 응답:", responseText);
        if (responseText) {
          errorMessage = responseText;
        } else {
          errorMessage = `회원가입에 실패했습니다. (상태 코드: ${response.status})`;
        }
      }

      throw new Error(errorMessage);
    }

    // 성공 시 응답 처리
    let result: SignUpResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      logger.error("응답 파싱 실패:", parseError);
      throw new Error("회원가입 응답 처리 중 오류가 발생했습니다.");
    }

    // 토큰 저장
    // access_token은 메모리에만 저장 (XSS 공격 방어)
    setInMemoryToken(result.data.access_token, result.data.expires_in);
    // refresh_token은 HttpOnly 쿠키로 서버에서 설정됨
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

    logger.log("✅ 회원가입 성공");
    return result;
  } catch (error) {
    logger.error("회원가입 실패:", error);
    throw error;
  }
};

/**
 * 일반 로그인 함수
 */
export const login = async (
  loginData: LoginRequest,
): Promise<LoginResponse> => {
  try {
    const requestBody: LoginRequest = {
      email: loginData.email.trim(),
      password: loginData.password,
    };

    logger.apiRequest("POST", "/v1/auth/login");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch(`${getApiUrl()}/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // 응답 본문을 텍스트로 먼저 읽기
    const responseText = await response.text();

    if (!response.ok) {
      logger.error("로그인 응답 에러:", {
        status: response.status,
        statusText: response.statusText,
      });

      let errorMessage = "로그인에 실패했습니다.";

      try {
        // JSON 파싱 시도
        const errorData: ApiErrorResponse = JSON.parse(responseText);
        logger.error("❌ 백엔드 에러 응답:", errorData);

        errorMessage = errorData.message || errorMessage;

        // 필드별 에러가 있는 경우
        if (errorData.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors
            .map((err) => err.message)
            .join(", ");
          errorMessage = errorMessages || errorMessage;
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 원본 텍스트 표시
        logger.error("에러 응답 파싱 실패:", parseError);
        logger.error("원본 응답:", responseText);
        if (responseText) {
          errorMessage = responseText;
        } else {
          errorMessage = `로그인에 실패했습니다. (상태 코드: ${response.status})`;
        }
      }

      throw new Error(errorMessage);
    }

    // 성공 시 응답 처리
    let result: LoginResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      logger.error("응답 파싱 실패:", parseError);
      throw new Error("로그인 응답 처리 중 오류가 발생했습니다.");
    }

    // 토큰 저장
    // access_token은 메모리에만 저장 (XSS 공격 방어)
    setInMemoryToken(result.data.access_token, result.data.expires_in);
    // refresh_token은 HttpOnly 쿠키로 서버에서 설정됨
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

    logger.log("✅ 로그인 성공");
    return result;
  } catch (error) {
    logger.error("로그인 실패:", error);
    throw error;
  }
};

/**
 * OAuth 설정 정보를 가져오는 함수
 */
export const getOAuthConfig = async (
  provider: OAuthProvider,
  platform: "web" | "mobile" = "web",
): Promise<OAuthConfigResponse> => {
  try {
    const url = `${getApiUrl()}/v1/auth/oauth/${provider}/config?platform=${platform}`;
    logger.apiRequest(
      "GET",
      `/v1/auth/oauth/${provider}/config?platform=${platform}`,
    );

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
    // 플랫폼 감지
    const isMobile = Capacitor.isNativePlatform();
    const platform = isMobile ? "mobile" : "web";

    logger.log(`소셜 로그인 시작 (플랫폼: ${platform})`, provider);

    const config = await getOAuthConfig(provider, platform);

    // 보안을 위해 state와 code_verifier, redirect_uri를 sessionStorage에 저장
    sessionStorage.setItem(OAUTH_STORAGE_KEYS.STATE, config.data.state);
    sessionStorage.setItem(
      OAUTH_STORAGE_KEYS.CODE_VERIFIER,
      config.data.code_verifier, // code_challenge가 아닌 code_verifier 사용
    );
    sessionStorage.setItem(OAUTH_STORAGE_KEYS.PROVIDER, provider);
    sessionStorage.setItem("oauth_redirect_uri", config.data.redirect_uri);

    if (isMobile) {
      // 모바일: 카카오와 구글은 네이티브 플러그인 사용, 네이버는 기존 방식
      if (provider === "kakao") {
        logger.log("모바일: 카카오 네이티브 플러그인으로 로그인");

        try {
          // 카카오 네이티브 로그인 실행
          const kakaoResult = await KakaoLoginPlugin.goLogin();
          logger.log("카카오 로그인 성공:", kakaoResult);

          // 카카오 액세스 토큰을 백엔드로 전달하여 우리 서버 토큰 받기
          const result = await processKakaoNativeLogin(kakaoResult.accessToken);

          // 로그인 성공 - 페이지 이동을 위해 커스텀 이벤트 발생
          if (result) {
            logger.log("✅ 모바일 카카오 로그인 성공");
            window.dispatchEvent(
              new CustomEvent("oauth-login-success", {
                detail: { userInfo: result.data.user_info },
              }),
            );
          }
        } catch (error) {
          logger.error("카카오 로그인 실패:", error);
          window.dispatchEvent(
            new CustomEvent("oauth-login-error", {
              detail: {
                error:
                  error instanceof Error
                    ? error.message
                    : "카카오 로그인 중 오류가 발생했습니다.",
              },
            }),
          );
          throw error;
        }
      } else if (provider === "google") {
        logger.log("모바일: 구글 네이티브 플러그인으로 로그인");

        try {
          // 구글 플러그인 초기화 (scopes 포함)
          await GoogleAuth.initialize({
            scopes: ["profile", "email"],
          });
          logger.log("구글 플러그인 초기화 완료");

          // 구글 네이티브 로그인 실행
          const googleResult = await GoogleAuth.signIn();
          logger.log("구글 로그인 성공:", {
            hasIdToken: !!googleResult.authentication?.idToken,
            hasAccessToken: !!googleResult.authentication?.accessToken,
            email: googleResult.email,
            id: googleResult.id,
          });

          // 구글 ID 토큰을 백엔드로 전달하여 우리 서버 토큰 받기
          if (!googleResult.authentication?.idToken) {
            logger.error("구글 로그인 결과:", googleResult);
            throw new Error("구글 ID 토큰을 받지 못했습니다.");
          }

          const result = await processGoogleNativeLogin(
            googleResult.authentication.idToken,
          );

          // 로그인 성공 - 페이지 이동을 위해 커스텀 이벤트 발생
          if (result) {
            logger.log("✅ 모바일 구글 로그인 성공");
            window.dispatchEvent(
              new CustomEvent("oauth-login-success", {
                detail: { userInfo: result.data.user_info },
              }),
            );
          }
        } catch (error) {
          logger.error("구글 로그인 실패:", error);

          // 에러 상세 정보 추출
          let errorMessage = "알 수 없는 오류";
          let errorDetails: any = {};

          if (error instanceof Error) {
            errorMessage = error.message;
            errorDetails = {
              message: error.message,
              stack: error.stack,
              name: error.name,
            };
          } else if (typeof error === "string") {
            errorMessage = error;
            errorDetails = { message: error };
          } else if (error && typeof error === "object") {
            try {
              errorMessage = JSON.stringify(error);
              errorDetails = error;
            } catch (e) {
              errorMessage = String(error);
              errorDetails = { raw: String(error) };
            }
          }

          logger.error("구글 로그인 에러 상세:", errorDetails);
          logger.error("구글 로그인 에러 메시지:", errorMessage);
          window.dispatchEvent(
            new CustomEvent("oauth-login-error", {
              detail: {
                error:
                  error instanceof Error
                    ? error.message
                    : "구글 로그인 중 오류가 발생했습니다.",
              },
            }),
          );
          throw error;
        }
      } else {
        // 네이버는 기존 In-App Browser 방식 사용
        logger.log("모바일: In-App Browser로 OAuth 페이지 열기", provider);

        await Browser.open({
          url: config.data.authorization_url,
          windowName: "_self",
        });

        // Deep Link 리스너 등록 (한 번만 등록되도록 체크)
        if (!window.oauthDeepLinkListenerRegistered) {
          window.oauthDeepLinkListenerRegistered = true;

          App.addListener("appUrlOpen", async (event) => {
            logger.log("Deep Link 수신:", event.url);

            // com.chingoohaja.app://oauth/callback/kakao?code=...
            try {
              const url = new URL(event.url);
              const code = url.searchParams.get("code");
              const state = url.searchParams.get("state");
              const error = url.searchParams.get("error");

              if (error) {
                logger.error("OAuth 에러:", error);
                await Browser.close();
                throw new Error(`OAuth 인증 중 오류가 발생했습니다: ${error}`);
              }

              if (code && state) {
                // Browser 닫기
                await Browser.close();

                // 저장된 값들과 비교하여 보안 검증
                const savedState = sessionStorage.getItem(
                  OAUTH_STORAGE_KEYS.STATE,
                );
                const codeVerifier = sessionStorage.getItem(
                  OAUTH_STORAGE_KEYS.CODE_VERIFIER,
                );
                const providerStr = sessionStorage.getItem(
                  OAUTH_STORAGE_KEYS.PROVIDER,
                );
                const redirectUri =
                  sessionStorage.getItem("oauth_redirect_uri");
                const provider = (["google", "kakao", "naver"] as const).find(
                  (p) => p === providerStr,
                );

                if (!provider || !savedState || !codeVerifier || !redirectUri) {
                  throw new Error(
                    "OAuth 세션 정보가 없습니다. 다시 로그인해주세요.",
                  );
                }

                if (state !== savedState) {
                  throw new Error(
                    "OAuth state 검증에 실패했습니다. 보안상 다시 로그인해주세요.",
                  );
                }

                // 백엔드로 로그인 요청
                const result = await processSocialLogin(
                  provider,
                  code,
                  state,
                  codeVerifier,
                  redirectUri,
                );

                // 로그인 성공 - 페이지 이동을 위해 커스텀 이벤트 발생
                if (result) {
                  logger.log("✅ 모바일 OAuth 로그인 성공");
                  // 앱이 이 이벤트를 감지하여 적절한 페이지로 이동
                  window.dispatchEvent(
                    new CustomEvent("oauth-login-success", {
                      detail: { userInfo: result.data.user_info },
                    }),
                  );
                }
              }
            } catch (error) {
              logger.error("Deep Link 처리 실패:", error);
              await Browser.close();
              // 에러 이벤트 발생
              window.dispatchEvent(
                new CustomEvent("oauth-login-error", {
                  detail: {
                    error:
                      error instanceof Error
                        ? error.message
                        : "로그인 처리 중 오류가 발생했습니다.",
                  },
                }),
              );
              throw error;
            }
          });
        }
      }
    } else {
      // 웹: 일반 리다이렉트
      logger.log("웹: 일반 리다이렉트");
      window.location.href = config.data.authorization_url;
    }
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

    // redirect_uri 가져오기
    const redirectUri = sessionStorage.getItem("oauth_redirect_uri");

    return await processSocialLogin(
      provider,
      code,
      state,
      codeVerifier,
      redirectUri || undefined,
    );
  };

/**
 * 구글 네이티브 로그인으로 받은 ID 토큰을 백엔드로 전달하는 함수
 */
export const processGoogleNativeLogin = async (
  googleIdToken: string,
): Promise<OAuthLoginResponse> => {
  try {
    logger.log("구글 네이티브 로그인 토큰을 백엔드로 전달");

    const requestBody = {
      google_id_token: googleIdToken,
      device_info: `${navigator.platform} - ${navigator.userAgent.split(" ")[0]}`,
    };

    logger.log("📤 전송할 데이터:", {
      provider: "google",
      google_token_length: googleIdToken?.length || 0,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.error("⏰ 구글 네이티브 로그인 요청 타임아웃 (60초 초과)");
      controller.abort();
    }, 60000);

    const startTime = Date.now();
    logger.apiRequest("POST", `/v1/auth/oauth/google/native`);

    let response: Response;
    try {
      response = await fetch(`${getApiUrl()}/v1/auth/oauth/google/native`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
        signal: controller.signal,
      });

      const elapsedTime = Date.now() - startTime;
      logger.log(`✅ 구글 네이티브 로그인 요청 완료: ${elapsedTime}ms`);
    } catch (fetchError) {
      const elapsedTime = Date.now() - startTime;
      logger.error(
        `❌ 구글 네이티브 로그인 요청 실패: ${elapsedTime}ms`,
        fetchError,
      );
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      logger.error("구글 네이티브 로그인 응답 에러:", {
        status: response.status,
        statusText: response.statusText,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        logger.error("❌ 백엔드 에러 응답:", errorData);
        throw new Error(errorData.message || "로그인에 실패했습니다.");
      } else {
        const text = await response.text();
        logger.error("예상치 못한 에러 응답:", text);
        throw new Error(`서버 에러: ${response.status} ${response.statusText}`);
      }
    }

    const result: OAuthLoginResponse = await response.json();

    // 토큰 저장
    setInMemoryToken(result.data.access_token, result.data.expires_in);

    // PII 보안: 최소한의 정보만 저장
    const minimalUserInfo: UserInfo = {
      id: result.data.user_info.id,
      is_new_user: result.data.user_info.is_new_user,
      is_profile_complete: result.data.user_info.is_profile_complete,
    };
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify(minimalUserInfo),
    );

    return result;
  } catch (error) {
    logger.error("구글 네이티브 로그인 처리 실패:", error);
    throw error;
  }
};

/**
 * 카카오 네이티브 로그인으로 받은 액세스 토큰을 백엔드로 전달하는 함수
 */
export const processKakaoNativeLogin = async (
  kakaoAccessToken: string,
): Promise<OAuthLoginResponse> => {
  try {
    logger.log("카카오 네이티브 로그인 토큰을 백엔드로 전달");

    const requestBody = {
      kakao_access_token: kakaoAccessToken,
      device_info: `${navigator.platform} - ${navigator.userAgent.split(" ")[0]}`,
    };

    logger.log("📤 전송할 데이터:", {
      provider: "kakao",
      kakao_token_length: kakaoAccessToken?.length || 0,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.error("⏰ 카카오 네이티브 로그인 요청 타임아웃 (60초 초과)");
      controller.abort();
    }, 60000);

    const startTime = Date.now();
    logger.apiRequest("POST", `/v1/auth/oauth/kakao/native`);

    let response: Response;
    try {
      response = await fetch(`${getApiUrl()}/v1/auth/oauth/kakao/native`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
        signal: controller.signal,
      });

      const elapsedTime = Date.now() - startTime;
      logger.log(`✅ 카카오 네이티브 로그인 요청 완료: ${elapsedTime}ms`);
    } catch (fetchError) {
      const elapsedTime = Date.now() - startTime;
      logger.error(
        `❌ 카카오 네이티브 로그인 요청 실패: ${elapsedTime}ms`,
        fetchError,
      );
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      logger.error("카카오 네이티브 로그인 응답 에러:", {
        status: response.status,
        statusText: response.statusText,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData: ApiErrorResponse = await response.json();
        logger.error("❌ 백엔드 에러 응답:", errorData);
        throw new Error(errorData.message || "로그인에 실패했습니다.");
      } else {
        const text = await response.text();
        logger.error("예상치 못한 에러 응답:", text);
        throw new Error(`서버 에러: ${response.status} ${response.statusText}`);
      }
    }

    const result: OAuthLoginResponse = await response.json();

    // 토큰 저장
    setInMemoryToken(result.data.access_token, result.data.expires_in);

    // PII 보안: 최소한의 정보만 저장
    const minimalUserInfo: UserInfo = {
      id: result.data.user_info.id,
      is_new_user: result.data.user_info.is_new_user,
      is_profile_complete: result.data.user_info.is_profile_complete,
    };
    localStorage.setItem(
      OAUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify(minimalUserInfo),
    );

    return result;
  } catch (error) {
    logger.error("카카오 네이티브 로그인 처리 실패:", error);
    throw error;
  }
};

/**
 * 백엔드로 인가 코드를 전송하고 토큰을 받는 함수
 */
export const processSocialLogin = async (
  provider: OAuthProvider,
  code: string,
  state: string,
  codeVerifier: string,
  redirectUri?: string,
): Promise<OAuthLoginResponse> => {
  try {
    const requestBody: OAuthLoginRequest = {
      code,
      state,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
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
      response = await fetch(`${getApiUrl()}/v1/auth/oauth/${provider}`, {
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
    try {
      localStorage.setItem(
        OAUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify(minimalUserInfo),
      );
    } catch (storageError) {
      // localStorage 접근이 차단된 경우 (예: iframe, 서드파티 쿠키 차단 등)
      if (import.meta.env.DEV) {
        console.warn("localStorage 저장 실패:", storageError);
      }
      // 에러를 throw하지 않고 계속 진행 (메모리 기반으로 동작 가능)
    }

    // sessionStorage 정리
    try {
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.PROVIDER);
    } catch (storageError) {
      // sessionStorage 접근이 차단된 경우 무시
      if (import.meta.env.DEV) {
        console.warn("sessionStorage 정리 실패:", storageError);
      }
    }

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
  try {
    const userInfoStr = localStorage.getItem(OAUTH_STORAGE_KEYS.USER_INFO);
    if (!userInfoStr) return null;

    try {
      return JSON.parse(userInfoStr);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error("사용자 정보 파싱 실패:", error);
      }
      return null;
    }
  } catch (storageError) {
    // localStorage 접근이 차단된 경우 (예: iframe, 서드파티 쿠키 차단 등)
    if (import.meta.env.DEV) {
      console.warn("localStorage 접근 불가:", storageError);
    }
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
      response = await fetch(`${getApiUrl()}/v1/auth/logout`, {
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
 * 인증 상태를 확인하는 함수 (동기)
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
 * 인증 상태를 확인하고 필요한 경우 refresh token으로 토큰을 갱신하는 함수 (비동기)
 * 새로고침 시 메모리 토큰이 없어도 localStorage에 user_info가 있으면 자동으로 토큰 갱신 시도
 */
export const checkAuthentication = async (): Promise<boolean> => {
  // 메모리에 토큰이 있으면 인증됨
  if (getInMemoryToken()) {
    if (import.meta.env.DEV) {
      logger.log("✅ 인증 상태: 메모리에 토큰 존재");
    }
    return true;
  }

  // 메모리에 토큰이 없으면 localStorage에 user_info가 있는지 확인
  const userInfo = getStoredUserInfo();
  if (!userInfo) {
    if (import.meta.env.DEV) {
      logger.log("❌ 인증 상태: 토큰 및 user_info 없음");
    }
    return false;
  }

  // localStorage에 user_info가 있으면 refresh token으로 토큰 갱신 시도
  if (import.meta.env.DEV) {
    logger.log("🔄 메모리 토큰 없음, refresh token으로 갱신 시도...");
  }

  try {
    const token = await refreshToken();
    if (token) {
      if (import.meta.env.DEV) {
        logger.log("✅ 토큰 갱신 성공 - 인증됨");
      }
      return true;
    } else {
      if (import.meta.env.DEV) {
        logger.log("❌ 토큰 갱신 실패 - 인증되지 않음");
      }
      // 토큰 갱신 실패 시 localStorage 정리
      try {
        localStorage.removeItem(OAUTH_STORAGE_KEYS.USER_INFO);
      } catch (error) {
        // localStorage 접근 실패는 무시
      }
      return false;
    }
  } catch (error) {
    logger.error("인증 확인 중 오류:", error);
    return false;
  }
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
    let response = await fetch(`${getApiUrl()}/v1/auth/me`, {
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
        response = await fetch(`${getApiUrl()}/v1/auth/me`, {
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
    let response = await fetch(`${getApiUrl()}/v1/users/profile`, {
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
        response = await fetch(`${getApiUrl()}/v1/users/profile`, {
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
    if (import.meta.env.DEV) {
      logger.log("🚀 앱 초기화: 인증 상태 확인...");
    }

    // 이미 메모리에 토큰이 있으면 스킵
    if (getInMemoryToken()) {
      if (import.meta.env.DEV) {
        logger.log("✅ 메모리에 토큰이 이미 존재 - 초기화 스킵");
      }
      return true;
    }

    // refresh token으로 새 access token 발급
    const token = await refreshToken();

    if (token) {
      if (import.meta.env.DEV) {
        logger.log("✅ 앱 초기화 성공: 토큰 발급 완료");
      }
      return true;
    } else {
      if (import.meta.env.DEV) {
        logger.log("ℹ️ 앱 초기화: 저장된 refresh token 없음 (로그인 필요)");
      }
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
    if (import.meta.env.DEV) {
      logger.log("🔄 이미 토큰 갱신 중 - 대기...");
    }
    return new Promise((resolve) => {
      subscribeTokenRefresh((token: string) => {
        resolve(token);
      });
    });
  }

  try {
    isRefreshingToken = true;
    if (import.meta.env.DEV) {
      logger.log("🔄 토큰 갱신 시작...");
    }

    // 네트워크 타임아웃 설정 (10초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      logger.apiRequest("POST", "/v1/auth/refresh");
      response = await fetch(`${getApiUrl()}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: "" }), // 서버에서 쿠키의 refresh_token을 사용
        credentials: "include", // 쿠키를 포함하여 요청
        signal: controller.signal,
      });
      if (import.meta.env.DEV) {
        logger.log(`📡 토큰 갱신 API 응답 상태: ${response.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401) {
        if (import.meta.env.DEV) {
          logger.warn("❌ 리프레시 토큰이 만료되었습니다.");
        }
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
    if (import.meta.env.DEV) {
      logger.log("📦 토큰 갱신 응답 데이터:", result);
    }

    // 새로운 access_token을 메모리에 저장
    setInMemoryToken(result.data.access_token, result.data.expires_in);
    if (import.meta.env.DEV) {
      logger.log("💾 새로운 access_token 메모리 저장 완료");
      logger.log("✅ 토큰 갱신 성공");
    }

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
