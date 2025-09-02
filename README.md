# 친구하자 Frontend

## 🛠 기술 스택

### Frontend

- **React 18** - 모던 React 기능 활용
- **TypeScript** - 타입 안전성 보장
- **Vite** - 빠른 개발 서버 및 빌드
- **TailwindCSS 3** - 유틸리티 퍼스트 CSS 프레임워크
- **React Router 6** - SPA 라우팅
- **React Query** - 서버 상태 관리 및 API 캐싱
- **shadcn/ui** - 고품질 UI 컴포넌트 라이브러리

### Backend (별도 프로젝트)

- **Spring Boot 3.x + WebFlux**
- **MySQL 8.0** (Aiven/AWS RDS)
- **Redis 7.0** (캐시/큐)
- **JWT + OAuth2** (Kakao, Google 인증)
- **Java 17+**

## 📁 프로젝트 구조

```
client/                   # React SPA 프론트엔드
├── pages/                # 페이지 컴포넌트
│   ├── Index.tsx         # 홈 페이지
│   └── NotFound.tsx      # 404 페이지
├── components/ui/        # shadcn/ui 컴포넌트 라이브러리
├── hooks/                # 커스텀 React 훅
├── lib/                  # 유틸리티 함수
├── App.tsx               # 앱 진입점 및 라우팅 설정
└── global.css            # TailwindCSS 테마 및 글로벌 스타일

shared/                   # 클라이언트-서버 공유 타입
└── api.ts                # API 인터페이스 정의
```

## 🚀 시작하기

### 필수 요구사항

- Node.js 18+
- pnpm (권장) 또는 npm

### 설치 및 실행

1. **의존성 설치**

   ```bash
   pnpm install
   ```

2. **개발 서버 실행**

   ```bash
   pnpm dev
   ```

3. **브라우저에서 확인**
   - 메인 애플리케이션: http://localhost:8080

### 기타 명령어

```bash
# 타입 체크
pnpm typecheck

# 테스트 실행
pnpm test

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행 (정적 파일 서빙)
pnpm start
```

## 🔧 환경 설정

### 환경 변수

`.env` 파일에서 다음 변수들을 설정할 수 있습니다:

```env
# Spring Boot API 서버 URL (예시)
VITE_API_BASE_URL=http://localhost:8080/api

# 기타 공개 변수들
VITE_APP_NAME=로그인 앱
```

## 📱 주요 기능

### UI/UX 특징

- 모바일 상태바 시뮬레이션 (모바일 뷰)
- 한국 서비스에 최적화된 디자인
- 접근성을 고려한 컴포넌트 설계

## 🔌 Spring Boot 연동

### API 연동 설정

Spring Boot 서버와 연동하려면:

1. **CORS 설정** (Spring Boot에서)

   ```java
   @CrossOrigin(origins = "http://localhost:8080")
   ```

2. **API 호출 설정** (React에서)
   ```typescript
   const API_BASE_URL =
     import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
   ```

### 인증 플로우

1. 로그인 요청 → Spring Boot `/auth/login`
2. JWT 토큰 수신 및 저장
3. 인증이 필요한 API 요청 시 Header에 토큰 포함
4. 소셜 로그인: OAuth2 플로우 처리

## 🚀 배포

### 프론트엔드 배포

- **Netlify/Vercel**: 자동 배포 지원
- **정적 호스팅**: 빌드된 SPA 파일 배포

### 백엔드 연동

- Spring Boot 서버를 별도로 배포
- 환경 변수로 API 서버 URL 설정

## 📝 개발 가이드

### 새 페이지 추가

1. `client/pages/`에 컴포넌트 생성
2. `client/App.tsx`에 라우트 추가

### API 호출 예시

```typescript
// React Query 사용
const { data, isLoading } = useQuery({
  queryKey: ["user"],
  queryFn: () => fetch("/api/user").then((res) => res.json()),
});
```

### 컴포넌트 사용

```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```
