/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * OAuth Provider Types
 */
export type OAuthProvider = "kakao" | "google" | "naver";

/**
 * OAuth Configuration Response
 */
export interface OAuthConfigResponse {
  data: {
    client_id: string;
    redirect_uri: string;
    scope: string;
    state: string;
    code_challenge: string;
    code_verifier: string;
    code_challenge_method: string;
    authorization_url: string;
  };
}

/**
 * User Information
 */
export interface UserInfo {
  id: number;
  email: string;
  nickname: string;
  is_new_user: boolean;
  is_profile_complete: boolean;
}

/**
 * OAuth Login Request
 */
export interface OAuthLoginRequest {
  code: string;
  state: string;
  code_verifier: string;
  device_info?: string;
}

/**
 * OAuth Login Response
 */
export interface OAuthLoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user_info: UserInfo;
  };
}

/**
 * Logout Request
 */
export interface LogoutRequest {
  refresh_token: string;
  logout_all: boolean;
}

/**
 * Logout Response
 */
export interface LogoutResponse {
  message: string;
}

/**
 * User Profile Response
 */
export interface UserProfileResponse {
  data: {
    id: number;
    email: string;
    nickname: string;
    is_new_user: boolean;
    is_profile_complete: boolean;
  };
  message: string;
  timestamp: string;
}

/**
 * API Error Response
 */
export interface ApiErrorResponse {
  message: string;
  error?: string;
  code?: string;
  timestamp?: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}
