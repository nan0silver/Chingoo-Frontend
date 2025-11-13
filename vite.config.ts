import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { readdirSync, statSync } from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
    proxy: {
      // API 요청을 백엔드 서버로 프록시
      "/api": {
        target: "http://43.202.193.103:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        timeout: 120000, // 타임아웃 120초로 증가 (기본값: 30초)
        proxyTimeout: 120000, // 프록시 타임아웃도 120초로 증가
      },
      // WebSocket 요청을 백엔드 서버로 프록시
      "/ws": {
        target: "http://43.202.193.103:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 120000, // 타임아웃 120초로 증가
        proxyTimeout: 120000,
      },
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin(), copyWellKnownPlugin()],
  publicDir: "public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  define: {
    global: "globalThis",
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}

function copyWellKnownPlugin(): Plugin {
  return {
    name: "copy-well-known",
    apply: "build",
    closeBundle() {
      const publicDir = path.resolve(__dirname, "public");
      const spaOutDir = path.resolve(__dirname, "dist/spa");
      const rootOutDir = path.resolve(__dirname, "dist");
      const wellKnownSource = path.join(publicDir, ".well-known");

      if (existsSync(wellKnownSource)) {
        // .well-known 디렉토리의 모든 파일 복사
        const files = readdirSync(wellKnownSource);

        // 1. dist/spa/.well-known/에 복사 (SPA 빌드 결과물)
        const spaWellKnownDest = path.join(spaOutDir, ".well-known");
        if (!existsSync(spaWellKnownDest)) {
          mkdirSync(spaWellKnownDest, { recursive: true });
        }

        // 2. dist/.well-known/에 복사 (서버 루트 경로용)
        const rootWellKnownDest = path.join(rootOutDir, ".well-known");
        if (!existsSync(rootWellKnownDest)) {
          mkdirSync(rootWellKnownDest, { recursive: true });
        }

        files.forEach((file) => {
          const sourcePath = path.join(wellKnownSource, file);

          if (statSync(sourcePath).isFile()) {
            // dist/spa/.well-known/에 복사
            const spaDestPath = path.join(spaWellKnownDest, file);
            copyFileSync(sourcePath, spaDestPath);
            console.log(
              `✅ Copied .well-known/${file} to dist/spa/.well-known/`,
            );

            // dist/.well-known/에 복사
            const rootDestPath = path.join(rootWellKnownDest, file);
            copyFileSync(sourcePath, rootDestPath);
            console.log(`✅ Copied .well-known/${file} to dist/.well-known/`);
          }
        });
      }
    },
  };
}
