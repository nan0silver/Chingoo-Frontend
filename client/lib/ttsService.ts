/**
 * Text-to-Speech 서비스
 * 웹: 브라우저의 Web Speech API 사용
 * 모바일: Capacitor TTS 플러그인 사용 (추후 설치 가능)
 */

/**
 * 음성 정보 타입
 */
export interface VoiceInfo {
  name: string;
  lang: string;
  default?: boolean;
  localService?: boolean;
  voiceURI: string;
}

/**
 * TTS 서비스 클래스
 */
export class TTSService {
  private isSupported: boolean;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    // 브라우저 Web Speech API 지원 여부 확인
    this.isSupported =
      typeof window !== "undefined" && "speechSynthesis" in window;

    if (this.isSupported) {
      // 음성 목록 로드 (비동기로 로드되므로 이벤트 리스너 등록)
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }

    if (import.meta.env.DEV) {
      console.log("🔊 TTS 지원 여부:", this.isSupported);
    }
  }

  /**
   * 사용 가능한 음성 목록 로드
   */
  private loadVoices(): void {
    if (this.isSupported) {
      this.voices = window.speechSynthesis.getVoices();
      if (import.meta.env.DEV) {
        console.log("🔊 사용 가능한 음성 목록:", this.voices.length);
        // 무한 재귀 방지: 직접 필터링하여 로그 출력
        const koreanVoices = this.voices.filter(
          (voice) => voice.lang.startsWith("ko") || voice.lang === "ko-KR",
        );
        console.log("🔊 한국어 음성:", koreanVoices.map((v) => v.name));
      }
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
      voice?: string | SpeechSynthesisVoice; // 음성 이름 또는 SpeechSynthesisVoice 객체
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

    // 음성 목록이 비어있으면 다시 로드
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options?.lang || "ko-KR"; // 한국어 기본값
        utterance.pitch = options?.pitch ?? 1;
        utterance.rate = options?.rate ?? 1;
        utterance.volume = options?.volume ?? 1;

        // 음성 선택
        if (options?.voice) {
          if (typeof options.voice === "string") {
            // 음성 이름으로 찾기
            const selectedVoice = this.voices.find(
              (v) =>
                v.name === options.voice ||
                v.voiceURI === options.voice ||
                v.name.toLowerCase().includes(options.voice.toLowerCase()),
            );
            if (selectedVoice) {
              utterance.voice = selectedVoice;
              if (import.meta.env.DEV) {
                console.log("🔊 선택된 음성:", selectedVoice.name);
              }
            } else {
              console.warn(
                `⚠️ 음성을 찾을 수 없습니다: ${options.voice}. 기본 음성 사용.`,
              );
            }
          } else {
            // SpeechSynthesisVoice 객체 직접 사용
            utterance.voice = options.voice;
          }
        } else {
          // 음성이 지정되지 않았으면 한국어 기본 음성 사용
          const koreanVoice = this.getDefaultKoreanVoice();
          if (koreanVoice) {
            utterance.voice = koreanVoice;
            if (import.meta.env.DEV) {
              console.log("🔊 기본 한국어 음성 사용:", koreanVoice.name);
            }
          }
        }

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

  /**
   * 사용 가능한 모든 음성 목록 가져오기
   */
  getVoices(): VoiceInfo[] {
    if (!this.isSupported) {
      return [];
    }
    // 음성 목록이 비어있으면 한 번만 로드 (재귀 방지)
    if (this.voices.length === 0) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices.map((voice) => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      localService: voice.localService,
      voiceURI: voice.voiceURI,
    }));
  }

  /**
   * 한국어 음성 목록 가져오기
   */
  getKoreanVoices(): VoiceInfo[] {
    if (!this.isSupported) {
      return [];
    }
    // 음성 목록이 비어있으면 한 번만 로드 (재귀 방지)
    if (this.voices.length === 0) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices
      .filter((voice) => voice.lang.startsWith("ko") || voice.lang === "ko-KR")
      .map((voice) => ({
        name: voice.name,
        lang: voice.lang,
        default: voice.default,
        localService: voice.localService,
        voiceURI: voice.voiceURI,
      }));
  }

  /**
   * 기본 한국어 음성 가져오기
   */
  getDefaultKoreanVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported) {
      return null;
    }
    // 음성 목록이 비어있으면 한 번만 로드 (재귀 방지)
    if (this.voices.length === 0) {
      this.voices = window.speechSynthesis.getVoices();
    }

    const koreanVoices = this.voices.filter(
      (voice) => voice.lang.startsWith("ko") || voice.lang === "ko-KR",
    );

    if (koreanVoices.length === 0) {
      return null;
    }

    // 기본 음성이 있으면 사용
    const defaultVoice = koreanVoices.find((voice) => voice.default);
    if (defaultVoice) {
      return defaultVoice;
    }

    // 기본 음성이 없으면 첫 번째 한국어 음성 사용
    return koreanVoices[0];
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

