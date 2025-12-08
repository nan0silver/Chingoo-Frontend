/**
 * 마지막 통화 시간을 표시 형식으로 변환
 * - 하루 전: "하루 전"
 * - 이틀 전: "이틀 전"
 * - 3일 이후 ~ 일주일 전: "(숫자)일 전"
 * - 일주일 넘어가면: 날짜 형식 (MM/DD)
 */
export function formatLastCallTime(lastCallAt: string): string {
  const now = new Date();
  const lastCall = new Date(lastCallAt);
  const diffMs = now.getTime() - lastCall.getTime();
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

