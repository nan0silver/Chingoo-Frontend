/**
 * Text-to-Speech 서비스
 * 웹: 브라우저의 Web Speech API 사용
 * 모바일: Capacitor TTS 플러그인 사용 (추후 설치 가능)
 */

/**
 * TTS 서비스 클래스
 */
export class TTSService {
  private isSupported: boolean;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    // 브라우저 Web Speech API 지원 여부 확인
    this.isSupported =
      typeof window !== "undefined" && "speechSynthesis" in window;

    if (import.meta.env.DEV) {
      console.log("🔊 TTS 지원 여부:", this.isSupported);
    }
  }

  /**
   * 텍스트를 음성으로 읽기
   * @param text 읽을 텍스트
   * @param options TTS 옵션
   */
  async speak(
    text: string,
    options?: {
      lang?: string; // 언어 코드 (예: 'ko-KR', 'en-US')
      pitch?: number; // 음성 높이 (0-2, 기본값: 1)
      rate?: number; // 읽기 속도 (0.1-10, 기본값: 1)
      volume?: number; // 볼륨 (0-1, 기본값: 1)
      onEnd?: () => void; // 읽기 완료 콜백
      onError?: (error: Error) => void; // 에러 콜백
    },
  ): Promise<void> {
    if (!this.isSupported) {
      console.warn("⚠️ TTS가 지원되지 않는 환경입니다.");
      if (options?.onError) {
        options.onError(new Error("TTS가 지원되지 않습니다."));
      }
      return;
    }

    // 이미 읽는 중이면 중지
    if (this.isSpeaking) {
      this.stop();
    }

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options?.lang || "ko-KR"; // 한국어 기본값
        utterance.pitch = options?.pitch ?? 1;
        utterance.rate = options?.rate ?? 1;
        utterance.volume = options?.volume ?? 1;

        // 읽기 완료 콜백
        utterance.onend = () => {
          this.isSpeaking = false;
          this.currentUtterance = null;
          if (options?.onEnd) {
            options.onEnd();
          }
          resolve();
        };

        // 에러 콜백
        utterance.onerror = (event) => {
          this.isSpeaking = false;
          this.currentUtterance = null;
          const error = new Error(
            `TTS 오류: ${event.error || "알 수 없는 오류"}`,
          );
          console.error("TTS 오류:", error);
          if (options?.onError) {
            options.onError(error);
          }
          reject(error);
        };

        this.currentUtterance = utterance;
        this.isSpeaking = true;

        // 음성 읽기 시작
        window.speechSynthesis.speak(utterance);

        if (import.meta.env.DEV) {
          console.log("🔊 TTS 시작:", text);
        }
      } catch (error) {
        this.isSpeaking = false;
        this.currentUtterance = null;
        const err =
          error instanceof Error ? error : new Error("TTS 실행 실패");
        console.error("TTS 실행 오류:", err);
        if (options?.onError) {
          options.onError(err);
        }
        reject(err);
      }
    });
  }

  /**
   * 현재 읽기 중지
   */
  stop(): void {
    if (this.isSupported && this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;

      if (import.meta.env.DEV) {
        console.log("🔇 TTS 중지");
      }
    }
  }

  /**
   * TTS 지원 여부 확인
   */
  getSupported(): boolean {
    return this.isSupported;
  }

  /**
   * 현재 읽는 중인지 확인
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

// 싱글톤 인스턴스
let ttsServiceInstance: TTSService | null = null;

/**
 * TTS 서비스 인스턴스 가져오기
 */
export const getTTSService = (): TTSService => {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
};

