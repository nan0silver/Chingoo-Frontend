import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chingoohaja.app",
  appName: "Chingoo-haja",
  webDir: "dist/spa",
  server: {
    androidScheme: "https",
    hostname: "localhost", // 필요 시 silverld.site로 변경
    allowNavigation: ["silverld.site"],
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
  },
};

export default config;
