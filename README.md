# 친구하자 (Frontend)

React 기반 SPA 프론트엔드. Capacitor로 iOS/Android 네이티브 앱 빌드 지원.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **런타임** | Node.js 18+, pnpm |
| **프레임워크** | React 18, TypeScript, Vite |
| **라우팅** | React Router 6 |
| **상태/API** | TanStack React Query, Zustand |
| **스타일** | TailwindCSS 3, Radix UI, Lucide Icons |
| **모바일** | Capacitor 7 (iOS/Android) |
| **백엔드** | 별도 API 서버 (이 레포는 프론트 전용) |

---

## 프로젝트 구조

```
client/                 # React SPA
├── pages/              # 라우트 페이지
├── components/         # 공통 컴포넌트
├── components/ui/      # UI 컴포넌트 라이브러리
├── hooks/              # 커스텀 훅
├── lib/                # 유틸, 스토어, API 클라이언트
├── App.tsx             # 진입점 및 라우팅
└── global.css          # Tailwind 테마

server/                 # 개발용 Express (Vite 연동)
├── index.ts
└── routes/

shared/                 # 클라이언트·서버 공유 타입
└── api.ts

ios/                    # Capacitor iOS 프로젝트
android/                # Capacitor Android 프로젝트
```

---

## 시작하기

### 요구사항

- Node.js 18+
- pnpm (권장)

### 설치 및 실행

```bash
pnpm install
pnpm dev
```

개발 서버: `http://localhost:3000` (프론트 + API 프록시 단일 포트)

### 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 (HMR) |
| `pnpm build` | 프로덕션 빌드 (client + server) |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm typecheck` | TypeScript 검사 |
| `pnpm test` | Vitest 테스트 |

---

## 모바일 빌드 (Capacitor)

### iOS

- **요구사항**: macOS, Xcode 15+, CocoaPods
- **순서**: `pnpm install` → `pnpm build` → `pnpm ios:sync` → `pnpm ios:open` (Xcode에서 서명/실행)
- **스크립트**: `ios:dev` (라이브 리로드), `ios:build`, `ios:sync`, `ios:open`

### Android

- **스크립트**: `android:dev`, `android:build`, `android:sync`

Capacitor 플러그인 추가·변경 후에는 해당 플랫폼에 대해 `ios:sync` 또는 `android:sync` 실행.

---

## 환경 변수

`VITE_*` 변수만 클라이언트에 노출됩니다. API 베이스 URL 등은 `.env`에 설정하고, 민감한 값은 저장소에 커밋하지 마세요.

---

## 개발 가이드

- **새 페이지**: `client/pages/`에 컴포넌트 추가 후 `client/App.tsx`에 `Route` 등록
- **스타일**: Tailwind + `cn()` (clsx + tailwind-merge). 테마/토큰은 `client/global.css`, `tailwind.config.ts`
- **API 타입**: `shared/api.ts`에 인터페이스 정의 후 클라이언트/서버에서 `@shared/api`로 import
- **경로 별칭**: `@/*` → client, `@shared/*` → shared

---

## 배포

- **웹**: `pnpm build` 후 `dist/spa` 정적 배포 (Netlify, Vercel 등)
- **모바일**: 별도 API 서버 URL을 환경 변수로 지정한 뒤 앱 스토어용 빌드

---

## 라이선스

Private.
