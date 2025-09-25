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
 * User Information (최소한의 정보만 저장)
 * PII(이메일, 닉네임)는 API에서 조회
 */
export interface UserInfo {
  id: number;
  is_new_user: boolean;
  is_profile_complete: boolean;
}

/**
 * User Profile Information (API에서 조회하는 전체 정보)
 */
export interface UserProfile {
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
 * refresh_token은 HttpOnly 쿠키로 전송되므로 body에서 제거
 */
export interface LogoutRequest {
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
  data: UserProfile;
  message: string;
  timestamp: string;
}

/**
 * Update Profile Request
 */
export interface UpdateProfileRequest {
  nickname: string;
}

/**
 * Update Profile Response
 */
export interface UpdateProfileResponse {
  message: string;
  data?: {
    nickname: string;
  };
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

/**
 * 매칭 및 통화 관련 타입들
 */

/**
 * 카테고리 정보
 */
export interface Category {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
}

/**
 * 위치 정보
 */
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * 매칭 요청
 */
export interface MatchingRequest {
  categoryId: number;
  location: Location;
  preferences?: {
    ageRange?: [number, number];
    gender?: "male" | "female" | "any";
    maxDistance?: number; // km
  };
}

/**
 * 매칭 상태
 */
export interface MatchingStatus {
  status: "waiting" | "matched" | "cancelled" | "timeout";
  queuePosition?: number;
  estimatedWaitTime?: number; // minutes
  categoryId?: number;
  location?: Location;
  matchedUser?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    age?: number;
    gender?: "male" | "female";
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 매칭 알림
 */
export interface MatchingNotification {
  type: "matched" | "cancelled" | "timeout";
  matchingId: string;
  matchedUser?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    age?: number;
    gender?: "male" | "female";
  };
  message: string;
  timestamp: string;
}

/**
 * 통화 시작 알림
 */
export interface CallStartNotification {
  type: "call_start";
  callId: string;
  matchingId: string;
  partner: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  callDuration?: number; // seconds
  timestamp: string;
}

/**
 * WebSocket 연결 상태
 */
export interface WebSocketConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

/**
 * 매칭 응답
 */
export interface MatchingResponse {
  matchingId: string;
  status: MatchingStatus["status"];
  queuePosition?: number;
  estimatedWaitTime?: number;
}

/**
 * 카테고리 목록 응답
 */
export interface CategoriesResponse {
  categories: Category[];
}

/**
 * WebSocket 메시지 타입
 */
export type WebSocketMessage = MatchingNotification | CallStartNotification;
