/**
 * 마지막 통화 시간을 표시 형식으로 변환
 * - 통화 이력이 없는 경우: "아직 친구와의 통화 내역이 없습니다."
 * - 하루 전: "하루 전"
 * - 이틀 전: "이틀 전"
 * - 3일 이후 ~ 일주일 전: "(숫자)일 전"
 * - 일주일 넘어가면: 날짜 형식 (MM/DD)
 */
export function formatLastCallTime(lastCallAt: string | null | undefined): string {
  // 통화 이력이 없는 경우
  if (!lastCallAt || lastCallAt.trim() === "") {
    return "아직 친구와의 통화 내역이 없습니다.";
  }

  const now = new Date();
  const lastCall = new Date(lastCallAt);
  
  // 유효하지 않은 날짜인 경우
  if (isNaN(lastCall.getTime())) {
    return "아직 친구와의 통화 내역이 없습니다.";
  }

  const diffMs = now.getTime() - lastCall.getTime();
  
  // diffMs가 유효하지 않은 경우 (음수이거나 NaN)
  if (isNaN(diffMs) || diffMs < 0) {
    return "아직 친구와의 통화 내역이 없습니다.";
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return "하루 전";
  } else if (diffDays === 2) {
    return "이틀 전";
  } else if (diffDays >= 3 && diffDays < 7) {
    return `${diffDays}일 전`;
  } else if (diffDays >= 7) {
    // 일주일 넘어가면 날짜 형식으로 표시
    const month = lastCall.getMonth() + 1;
    const day = lastCall.getDate();
    return `${month}/${day}`;
  } else {
    // 오늘 통화한 경우 (diffDays === 0)
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes === 0) {
        return "방금 전";
      }
      return `${diffMinutes}분 전`;
    }
    return `${diffHours}시간 전`;
  }
}

