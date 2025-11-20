import { useEffect, useState } from "react";
import { SplashScreen } from "@capacitor/splash-screen";

interface CustomSplashScreenProps {
  onComplete: () => void;
  /**
   * 스플래시 스크린에 표시할 아이콘 이미지 경로 배열
   * 순서대로 표시됩니다.
   */
  icons?: string[];
  /**
   * 각 아이콘을 표시하는 시간 (밀리초)
   * @default 500
   */
  iconDuration?: number;
  /**
   * 전체 스플래시 스크린 최소 표시 시간 (밀리초)
   * @default 2000
   */
  minDisplayDuration?: number;
  /**
   * 아이콘 애니메이션 타입
   * 'slide-up': 위로 슬라이드되며 사라짐
   * 'fade': 페이드 아웃
   * 'none': 애니메이션 없음
   * @default 'slide-up'
   */
  animationType?: "slide-up" | "fade" | "none";
  /**
   * 배경색
   * @default "#ffffff"
   */
  backgroundColor?: string;
}

/**
 * 커스텀 스플래시 스크린 컴포넌트
 * 여러 아이콘이 순차적으로 표시되며 위로 슬라이드되며 사라지는 애니메이션을 제공합니다.
 */
export const CustomSplashScreen = ({
  onComplete,
  icons = [],
  iconDuration = 500,
  minDisplayDuration = 2000,
  animationType = "slide-up",
  backgroundColor = "#ffffff",
}: CustomSplashScreenProps) => {
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Capacitor 기본 스플래시 스크린 즉시 숨기기
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (error) {
        // 웹 환경에서는 에러가 발생할 수 있으므로 무시
        if (import.meta.env.DEV) {
          console.log(
            "네이티브 스플래시 스크린 숨기기 실패 (웹 환경일 수 있음)",
          );
        }
      }
    };

    hideNativeSplash();
  }, []);

  useEffect(() => {
    if (icons.length === 0) {
      // 아이콘이 없으면 최소 시간만 대기 후 완료
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300); // 페이드 아웃 시간
      }, minDisplayDuration);

      return () => clearTimeout(timer);
    }

    // 아이콘 순차 표시 로직
    const totalAnimationDuration = icons.length * iconDuration;
    const actualDuration = Math.max(totalAnimationDuration, minDisplayDuration);

    // 마지막 아이콘까지 순차적으로 표시
    const iconInterval = setInterval(() => {
      setCurrentIconIndex((prev) => {
        if (prev < icons.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, iconDuration);

    // 전체 애니메이션 완료 후 숨기기
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // 페이드 아웃 시간
    }, actualDuration);

    return () => {
      clearInterval(iconInterval);
      clearTimeout(completeTimer);
    };
  }, [icons, iconDuration, minDisplayDuration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* 모든 아이콘을 렌더링하되, 현재 인덱스만 표시 */}
        {icons.map((icon, index) => {
          const isActive = index === currentIconIndex;
          const isPast = index < currentIconIndex;
          const isNext = index > currentIconIndex;

          // 애니메이션 스타일 결정
          let transform = "";
          let opacity = 1;

          if (animationType === "slide-up") {
            if (isActive) {
              // 현재 활성 아이콘: 중앙에 위치
              transform = "translateY(0)";
              opacity = 1;
            } else if (isPast) {
              // 지나간 아이콘: 위로 이동하며 사라짐
              transform = "translateY(-100px)";
              opacity = 0;
            } else {
              // 아직 표시되지 않은 아이콘: 투명
              transform = "translateY(0)";
              opacity = 0;
            }
          } else if (animationType === "fade") {
            opacity = isActive ? 1 : 0;
            transform = "translateY(0)";
          } else {
            // none
            opacity = isActive ? 1 : 0;
            transform = "translateY(0)";
          }

          return (
            <div
              key={index}
              className="absolute flex items-center justify-center"
              style={{
                opacity,
                transform,
                transition:
                  "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              <img
                src={icon}
                alt={`Splash icon ${index + 1}`}
                className="w-32 h-32 object-contain"
                onError={(e) => {
                  // 이미지 로드 실패 시 기본 이미지로 대체
                  if (import.meta.env.DEV) {
                    console.warn(`스플래시 아이콘 로드 실패: ${icon}`);
                  }
                }}
              />
            </div>
          );
        })}

        {/* 아이콘이 없는 경우 기본 로딩 표시 */}
        {icons.length === 0 && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        )}
      </div>
    </div>
  );
};
