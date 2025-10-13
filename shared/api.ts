/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

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
  is_new_user?: boolean; // API에서 제공하지 않을 수 있음
  is_profile_complete?: boolean; // API에서 제공하지 않을 수 있음
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
  nickname?: string;
  gender?: string;
  birth?: string; // YYYY-MM-DD 형식
}

/**
 * Update Profile Response
 */
export interface UpdateProfileResponse {
  message: string;
  data?: {
    nickname?: string;
    gender?: string;
    birth?: string;
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
  category_id: number;
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
  type: "matched" | "cancelled" | "timeout" | "position_update";
  matchingId: string;
  matchedUser?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    age?: number;
    gender?: "male" | "female";
  };
  queuePosition?: number;
  estimatedWaitTime?: number;
  message: string;
  timestamp: string;
}

/**
 * 통화 시작 알림
 */
export interface CallStartNotification {
  type?: "call_start";
  callId: number;
  matchingId?: string;
  partnerId: number;
  partnerNickname: string;
  channelName: string;
  rtcToken: string;
  agoraUid: number;
  appId?: string; // 백엔드에서 보내주거나 프론트엔드에서 설정
  expiresAt: string;
  timestamp?: string;
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
  queue_id: string;
  category_id: number;
  category_name: string;
  queue_status: "WAITING" | "MATCHED" | "CANCELLED" | "TIMEOUT";
  estimated_wait_time_seconds: number;
  queue_position: number;
  created_at: string;
  waiting: boolean;
  matching: boolean;
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

/**
 * 카테고리 상수
 */
export const CATEGORIES = {
  HOBBY: { id: 1, name: "취미", icon: "hobby.png" },
  CHILDREN: { id: 2, name: "자녀", icon: "children.png" },
  COOKING: { id: 3, name: "요리", icon: "cooking.png" },
  MEMORIES: { id: 4, name: "추억", icon: "memories.png" },
  MUSIC: { id: 5, name: "음악", icon: "music.png" },
  TRAVEL: { id: 6, name: "여행", icon: "travel.png" },
} as const;

export type CategoryId = (typeof CATEGORIES)[keyof typeof CATEGORIES]["id"];
export type CategoryName = (typeof CATEGORIES)[keyof typeof CATEGORIES]["name"];
