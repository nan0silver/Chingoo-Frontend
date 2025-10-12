import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

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
  plugins: [react(), expressPlugin()],
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
