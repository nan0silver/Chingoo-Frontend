# 스플래시 스크린 및 아이콘 이미지 가이드

이 폴더에는 Capacitor 앱의 스플래시 스크린과 아이콘을 생성하기 위한 소스 이미지가 필요합니다.

## 필요한 파일

다음 파일들을 이 폴더에 준비해주세요:

### 필수 파일

- **icon-only.png** (최소 1024x1024px)
  - 앱 아이콘으로 사용됩니다. 투명 배경이 가능합니다.

- **splash.png** (최소 2732x2732px)
  - 스플래시 스크린 이미지입니다. 가로/세로 비율이 1:1인 정사각형 이미지를 권장합니다.

### 선택 파일

- **icon-foreground.png** (최소 1024x1024px)
  - Android 12+ 어댑티브 아이콘의 전경 이미지입니다.

- **icon-background.png** (최소 1024x1024px)
  - Android 12+ 어댑티브 아이콘의 배경 이미지입니다.

- **splash-dark.png** (최소 2732x2732px)
  - 다크 모드용 스플래시 스크린 이미지입니다.

## 이미지 생성 방법

이미지를 준비한 후, 다음 명령어를 실행하여 모든 플랫폼용 이미지를 자동 생성합니다:

```bash
# 모든 플랫폼용 이미지 생성
pnpm run generate:assets

# 또는 특정 플랫폼만 생성
npx capacitor-assets generate --ios
npx capacitor-assets generate --android
npx capacitor-assets generate --pwa
```

## 이미지 요구사항

- **형식**: PNG 또는 JPG
- **아이콘**: 최소 1024x1024px (정사각형 권장)
- **스플래시**: 최소 2732x2732px (정사각형 권장)
- **색상**: sRGB 색공간 사용 권장

## 참고

생성된 이미지는 다음 위치에 자동으로 배치됩니다:

- Android: `android/app/src/main/res/`
- iOS: `ios/App/App/Assets.xcassets/`
