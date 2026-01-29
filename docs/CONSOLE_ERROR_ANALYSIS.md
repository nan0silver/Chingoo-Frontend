# 통화 중 콘솔 에러 분석 (2026-01-29)

한 통화 세션에서 발생한 콘솔 로그를 분석한 결과입니다.

---

## 1. 매칭 상태 조회 오류: `Error: 매칭 상태 조회 성공`

**증상**
- `getMatchingStatus`에서 `Error: 매칭 상태 조회 성공`이 throw됨
- 이어서 "매칭 상태 조회 실패, 저장된 정보로 복원" 로그가 찍힘

**원인**
- **백엔드 API** `GET /api/v1/calls/match/status`가 **HTTP 200**으로 응답하면서
  - `success: false` 이거나 `data`가 비어 있고
  - `message`에 **"매칭 상태 조회 성공"**이 들어 있는 경우가 있음
- 클라이언트는 `matchingApi.ts`에서 `if (!result.success || !result.data)`일 때  
  `throw new Error(result.message || "매칭 상태 조회에 실패했습니다.")` 를 수행하므로,  
  실제로는 실패인데 메시지만 "성공"이라서 혼란스러운 에러가 발생함

**수정 방향**
- **백엔드**: 매칭 상태 조회가 성공이면 반드시  
  `{ success: true, data: MatchingStatus }` 형태로 응답  
  실패일 때만 `success: false`와 에러용 `message` 사용
- 백엔드 수정 전까지는, 클라이언트에서 `result.message === "매칭 상태 조회 성공"`인 경우  
  별도 처리(예: 재시도 또는 기본값)를 넣는 식으로 완화 가능

---

## 2. "매칭 상태 조회 실패, 저장된 정보로 복원"

**증인**
- 위 1번 에러가 발생한 뒤 `App.tsx`의 `catch`에서 출력되는 로그

**동작**
- 앱 초기화 시 매칭 상태 복원을 위해 `refreshMatchingStatus()`를 호출
- `getMatchingStatus()`가 throw되면 catch에서  
  "매칭 상태 조회 실패, 저장된 정보로 복원"을 로그하고  
  `restoreMatchingState(restoredMatching)`으로 로컬 저장 정보만으로 복원

**정리**
- 1번(백엔드 응답 형식)이 해결되면 이 로그는 정상적인 실패 상황에서만 나오게 됨

---

## 3. "이미 연결 중이거나 연결되어 있습니다."

**증상**
- `websocket.ts`의 `connect()` 안에서 위 로그가 여러 번 출력됨

**원인**
- `connectWebSocket()`이 **한 세션 동안 여러 번** 호출됨
- 콜백 개수 로그가 3 → 4 → 5 → 6 → 7로 늘어나는 것으로 보아  
  **같은 콜백이 여러 번 등록**되고, 그때마다 연결 시도가 일어나는 구조로 추정
- 가능한 원인:
  - `App.tsx`의 `useEffect` 의존성 배열에 `connectWebSocket`이 있어서  
    스토어/함수 참조가 바뀔 때마다 effect 재실행
  - 매칭/통화 관련 페이지가 리마운트되면서  
    WebSocket 연결·콜백 등록을 반복

**수정 방향**
- WebSocket 연결은 **앱 기준 1회**만 하도록 제한 (예: ref로 “이미 연결 시도함” 플래그)
- 콜백 등록은 **effect cleanup**에서 제거하도록 해서,  
  컴포넌트 언마운트/의존성 변경 시 중복 등록 방지

---

## 4. Agora-SDK WARNING: "You input a string as the user ID"

**증상**
- Agora 채널 입장 시 SDK에서 문자열 UID 사용에 대한 경고

**원인**
- `useCall.ts`에서 `uid: String(notification.agoraUid)` 로 **문자열**을 넘기고 있음
- Agora는 **숫자 UID** 사용을 권장함

**수정**
- 채널 입장 시 `agoraUid`를 **숫자**로 전달하도록 변경 (프론트엔드에서 적용 가능)

---

## 5. WebSocket connection to 'wss://...edge.sd-rtn.com:4705/' failed: WebSocket is closed before the connection is established

**증상**
- Agora 엣지 서버(`sd-rtn.com`)로 가는 WebSocket이  
  연결이 완료되기 전에 닫힘

**가능한 원인**
- 통화 시작(call-start) 수신 직후 `joinChannel`이 호출되는데,  
  그 전이나 직후에 **다른 로직에서 채널을 나가거나 클라이언트를 정리**하는 경우
- **짧은 시간에 join이 여러 번** 호출되거나,  
  컴포넌트 리마운트로 인해 이전 join이 취소되는 경우
- 4번처럼 **문자열 UID**로 인한 SDK 내부 동작 이슈 가능성

**수정 방향**
- 4번처럼 UID를 숫자로 통일
- join/leave와 채널 전환 로직을 정리해서  
  “한 번의 통화 시작 = 한 번의 join”이 되도록 하고,  
  불필요한 재연결/중복 join 제거

---

## 요약 표

| 현상 | 원인 | 담당 |
|------|------|------|
| `Error: 매칭 상태 조회 성공` | 백엔드가 성공 메시지를 실패 응답에 넣음 | 백엔드 API 수정 |
| 매칭 상태 조회 실패, 저장된 정보로 복원 | 위 에러에 따른 정상 fallback 로그 | 1번 해결 시 정리 |
| 이미 연결 중이거나 연결되어 있습니다 | WebSocket connect/콜백 중복 호출·등록 | 프론트: 1회 연결 + cleanup |
| Agora string user ID warning | UID를 문자열로 전달 | 프론트: 숫자 UID 전달 |
| Agora WebSocket closed before established | join 타이밍/중복 또는 UID 이슈 | 프론트: join 일원화 + UID 수정 |

이 문서는 해당 통화 콘솔 로그를 기준으로 작성되었습니다.
