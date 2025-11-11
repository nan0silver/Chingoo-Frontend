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
  },
};

export default config;
