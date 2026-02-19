/**
 * 보안 로깅 유틸리티
 * 프로덕션 환경에서 민감한 정보를 마스킹하여 로그 출력
 */

const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

/**
 * URL을 마스킹 처리
 * 예: http://43.202.193.103:8080/api/v1/auth/login -> <URL>
 */
const maskUrl = (url: string): string => {
  if (IS_DEV) return url;
  return "<URL>";
};

/**
 * 토큰을 마스킹 처리
 * 예: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... -> <TOKEN>
 */
const maskToken = (token: string | null | undefined): string => {
  if (!token) return "<EMPTY>";
  if (IS_DEV) return token.substring(0, 20) + "...";
  return "<TOKEN>";
};

/**
 * 에러 메시지에서 URL을 마스킹
 */
const maskErrorMessage = (error: unknown): string => {
  if (!error) return "Unknown error";

  let message = error instanceof Error ? error.message : String(error);

  if (IS_PROD) {
    // URL 패턴을 찾아서 <URL>로 변경
    message = message.replace(/https?:\/\/[^\s'"]+/g, "<URL>");
  }

  return message;
};

/**
 * 객체의 민감한 필드를 마스킹
 */
const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  if (IS_DEV) return data;

  const masked = { ...data };
  const sensitiveFields = [
    "url",
    "authorization_url",
    "token",
    "access_token",
    "refresh_token",
    "code",
    "state",
    "code_verifier",
    "code_challenge",
  ];

  for (const field of sensitiveFields) {
    if (field in masked) {
      if (field.includes("url")) {
        masked[field] = "<URL>";
      } else {
        masked[field] = "<REDACTED>";
      }
    }
  }

  return masked;
};

/**
 * 안전한 console.log (프로덕션에서는 출력 안 함)
 */
export const safeLog = (...args: any[]) => {
  if (IS_PROD) return; // 운영 환경에서는 로그 비활성화
  if (!IS_DEV && !IS_PROD) return; // 테스트 환경에서는 로그 안 함

  const maskedArgs = args.map((arg) => {
    if (typeof arg === "string") {
      // URL 패턴을 찾아서 마스킹
      if (IS_PROD && /https?:\/\//.test(arg)) {
        return arg.replace(/https?:\/\/[^\s'"]+/g, "<URL>");
      }
      return arg;
    }
    if (typeof arg === "object") {
      return maskSensitiveData(arg);
    }
    return arg;
  });

  console.log(...maskedArgs);
};

/**
 * 안전한 console.error
 */
export const safeError = (...args: any[]) => {
  if (!IS_DEV && !IS_PROD) return; // 테스트 환경에서는 로그 안 함

  const maskedArgs = args.map((arg) => {
    if (arg instanceof Error) {
      return maskErrorMessage(arg);
    }
    if (typeof arg === "string") {
      if (IS_PROD && /https?:\/\//.test(arg)) {
        return arg.replace(/https?:\/\/[^\s'"]+/g, "<URL>");
      }
      return arg;
    }
    if (typeof arg === "object") {
      return maskSensitiveData(arg);
    }
    return arg;
  });

  console.error(...maskedArgs);
};

/**
 * 안전한 console.warn (프로덕션에서는 출력 안 함)
 */
export const safeWarn = (...args: any[]) => {
  if (IS_PROD) return; // 운영 환경에서는 로그 비활성화
  if (!IS_DEV && !IS_PROD) return; // 테스트 환경에서는 로그 안 함

  const maskedArgs = args.map((arg) => {
    if (typeof arg === "string") {
      if (IS_PROD && /https?:\/\//.test(arg)) {
        return arg.replace(/https?:\/\/[^\s'"]+/g, "<URL>");
      }
      return arg;
    }
    if (typeof arg === "object") {
      return maskSensitiveData(arg);
    }
    return arg;
  });

  console.warn(...maskedArgs);
};

/**
 * API 요청 로그 (개발 환경에서만)
 */
export const logApiRequest = (method: string, endpoint: string, data?: any) => {
  if (!IS_DEV) return;

  console.group(`📡 API ${method}`);
  console.log("Endpoint:", endpoint);
  if (data) {
    console.log("Data:", maskSensitiveData(data));
  }
  console.groupEnd();
};

/**
 * API 응답 로그 (개발 환경에서만)
 */
export const logApiResponse = (
  method: string,
  endpoint: string,
  status: number,
  data?: any,
) => {
  if (!IS_DEV) return;

  const emoji = status >= 200 && status < 300 ? "✅" : "❌";
  console.group(`${emoji} API ${method} - ${status}`);
  console.log("Endpoint:", endpoint);
  if (data) {
    console.log("Response:", maskSensitiveData(data));
  }
  console.groupEnd();
};

/**
 * 디버그 그룹 로그 (개발 환경에서만)
 */
export const logDebugGroup = (title: string, data: Record<string, any>) => {
  if (!IS_DEV) return;

  console.group(`🔍 ${title}`);
  Object.entries(data).forEach(([key, value]) => {
    console.log(`${key}:`, maskSensitiveData(value));
  });
  console.groupEnd();
};

// Export utilities
export const logger = {
  log: safeLog,
  error: safeError,
  warn: safeWarn,
  apiRequest: logApiRequest,
  apiResponse: logApiResponse,
  debugGroup: logDebugGroup,
  maskUrl,
  maskToken,
  maskErrorMessage,
};
