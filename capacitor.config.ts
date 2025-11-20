/// <reference types="@capacitor/splash-screen" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chingoohaja.app",
  appName: "Chingoo-haja",
  webDir: "dist/spa",
  server: {
    androidScheme: "https",
    hostname: "localhost", // 필요 시 silverld.site로 변경
    allowNavigation: ["silverld.site", "*.silverld.site"],
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId:
        "251609733477-thoh9ldn3b2ve4ap31pt4pelau8bgsaa.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 0, // 커스텀 스플래시를 사용하므로 0으로 설정 (즉시 숨김)
      launchAutoHide: true, // 자동으로 숨길지 여부
      launchFadeOutDuration: 0, // 페이드 아웃 애니메이션 시간 (커스텀 스플래시에서 처리)
      backgroundColor: "#ffffff", // 배경색 (hex 형식) - 커스텀 스플래시와 동일하게 설정
      androidSplashResourceName: "splash", // Android 리소스 이름
      androidScaleType: "CENTER_CROP", // 이미지 스케일 타입: CENTER, CENTER_CROP, CENTER_INSIDE, FIT_CENTER, FIT_XY
      showSpinner: false, // 스피너 표시 여부
      androidSpinnerStyle: "large", // Android 스피너 스타일: horizontal, small, large, inverse, smallInverse, largeInverse
      iosSpinnerStyle: "small", // iOS 스피너 스타일: small, large
      spinnerColor: "#999999", // 스피너 색상
      splashFullScreen: true, // 전체 화면 표시 (Android만)
      splashImmersive: false, // 상태바와 네비게이션 바 숨김 (Android만)
    },
  },
};

export default config;
