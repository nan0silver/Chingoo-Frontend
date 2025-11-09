package com.chingoohaja.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

import java.lang.reflect.Method;

public class MainActivity extends BridgeActivity {
    private static final int AUDIO_PERMISSION_REQUEST_CODE = 1001;
    private static final String[] AUDIO_PERMISSIONS = new String[]{
        Manifest.permission.RECORD_AUDIO
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        suppressChromiumCameraLogs();

        setupWebViewBeforeLoad();

        requestAudioPermissionsIfNeeded();
        setupAudioOnlyPermissionHandling();
    }

    private void setupWebViewBeforeLoad() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

            // 페이지 로드 전에 스크립트 주입
            injectAudioOnlyMediaDevicesPatch();
            injectFontFamilyOverride();
        }
    }

    private void suppressChromiumCameraLogs() {
        try {
            // WebView의 verbose 로그 비활성화
            android.webkit.WebView.setWebContentsDebuggingEnabled(false);

            // 프로세스 레벨에서 로그 레벨 조정 시도
            java.util.logging.Logger.getLogger("chromium").setLevel(java.util.logging.Level.SEVERE);
            java.util.logging.Logger.getLogger("cr_VideoCapture").setLevel(java.util.logging.Level.OFF);
        } catch (Exception ignored) {
            // 실패해도 앱 동작에는 영향 없음
        }
    }

    private void setupAudioOnlyPermissionHandling() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        getBridge()
            .getWebView()
            .setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        String[] resources = request.getResources();
                        if (resources == null || resources.length == 0) {
                            request.deny();
                            return;
                        }

                        boolean shouldGrantAudio = false;
                        for (String resource : resources) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                                shouldGrantAudio = true;
                                break;
                            }
                        }

                        if (shouldGrantAudio) {
                            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                        } else {
                            request.deny();
                        }
                    } else {
                        super.onPermissionRequest(request);
                    }
                }
            });

        injectAudioOnlyMediaDevicesPatch();
        injectFontFamilyOverride();
    }

    private void injectAudioOnlyMediaDevicesPatch() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            return;
        }

        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        String script =
                "(function() {\n" +
                        "  console.log('[ChingooHaja] Blocking all camera access at JS level');\n" +
                        "  \n" +
                        "  // 1. navigator.mediaDevices 완전 오버라이드\n" +
                        "  if (navigator.mediaDevices) {\n" +
                        "    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;\n" +
                        "    navigator.mediaDevices.getUserMedia = function(constraints) {\n" +
                        "      if (constraints && constraints.video) {\n" +
                        "        console.warn('[ChingooHaja] Video request blocked');\n" +
                        "        delete constraints.video;\n" +
                        "      }\n" +
                        "      if (!constraints || !constraints.audio) {\n" +
                        "        return Promise.reject(new Error('Only audio is supported'));\n" +
                        "      }\n" +
                        "      return originalGetUserMedia.call(navigator.mediaDevices, constraints);\n" +
                        "    };\n" +
                        "    \n" +
                        "    // 2. enumerateDevices에서 비디오 디바이스 완전 제거\n" +
                        "    const originalEnumerate = navigator.mediaDevices.enumerateDevices;\n" +
                        "    navigator.mediaDevices.enumerateDevices = function() {\n" +
                        "      return originalEnumerate.call(navigator.mediaDevices).then(function(devices) {\n" +
                        "        return devices.filter(function(d) { return d.kind === 'audioinput' || d.kind === 'audiooutput'; });\n" +
                        "      });\n" +
                        "    };\n" +
                        "  }\n" +
                        "  \n" +
                        "  // 3. 레거시 API도 차단\n" +
                        "  if (navigator.getUserMedia) {\n" +
                        "    navigator.getUserMedia = function(constraints, success, error) {\n" +
                        "      if (constraints && constraints.video) {\n" +
                        "        error(new Error('Video not supported'));\n" +
                        "        return;\n" +
                        "      }\n" +
                        "    };\n" +
                        "  }\n" +
                        "})();";

        // WebView가 완전히 로드되기 전에 주입
        getBridge().getWebView().evaluateJavascript(script, null);
    }

    private void injectFontFamilyOverride() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            return;
        }

        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        String script =
                "(function() {\n" +
                        "  try {\n" +
                        "    var head = document.head || document.getElementsByTagName('head')[0];\n" +
                        "    if (!head) { return; }\n" +
                        "    if (document.getElementById('chingoo-noto-sans')) { return; }\n" +
                        "    var style = document.createElement('style');\n" +
                        "    style.id = 'chingoo-noto-sans';\n" +
                        "    style.innerHTML = \"@font-face { font-family: 'Noto Sans KR'; font-style: normal; font-weight: 400; font-display: swap; src: url('fonts/noto-sans-kr/NotoSansKR-Regular.ttf') format('truetype'); }\" +\n" +
                        "      \"@font-face { font-family: 'Noto Sans KR'; font-style: normal; font-weight: 500; font-display: swap; src: url('fonts/noto-sans-kr/NotoSansKR-Medium.ttf') format('truetype'); }\" +\n" +
                        "      \"@font-face { font-family: 'Noto Sans KR'; font-style: normal; font-weight: 700; font-display: swap; src: url('fonts/noto-sans-kr/NotoSansKR-Bold.ttf') format('truetype'); }\" +\n" +
                        "      \"html, body, button, input, textarea, select { font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; }\";\n" +
                        "    head.appendChild(style);\n" +
                        "  } catch (e) {\n" +
                        "    console.warn('[ChingooHaja] Failed to inject font override', e);\n" +
                        "  }\n" +
                        "})();";

        getBridge().getWebView().evaluateJavascript(script, null);
    }

    private void requestAudioPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return;
        }

        if (!hasAudioPermission()) {
            ActivityCompat.requestPermissions(
                this,
                AUDIO_PERMISSIONS,
                AUDIO_PERMISSION_REQUEST_CODE
            );
        }
    }

    private boolean hasAudioPermission() {
        for (String permission : AUDIO_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode != AUDIO_PERMISSION_REQUEST_CODE) {
            return;
        }

        if (!hasAudioPermission()) {
            Toast.makeText(this, "마이크 권한이 허용되어야 통화가 가능합니다.", Toast.LENGTH_LONG).show();
        }
    }
}
