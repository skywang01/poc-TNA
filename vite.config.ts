import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Same-origin proxy to bipo-ai-service. The browser calls /api/... (same origin
// as the SPA), Vite forwards to BIPO_TARGET server-side — so there is no CORS
// problem, and the Bearer token is injected here (never shipped to the browser).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.BIPO_TARGET || "http://localhost:8000";
  const token = env.BIPO_TOKEN || "";

  return {
    plugins: [react()],
    server: {
      port: 5180,
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      },
    },
  };
});
