import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Same-origin proxy to bipo-ai-service. The browser calls /api/... (same origin
// as the SPA), Vite forwards to BIPO_TARGET server-side — so there is no CORS
// problem, and the Bearer token is injected here (never shipped to the browser).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.BIPO_TARGET || "http://localhost:8000";
  const serviceKey = env.BIPO_SERVICE_KEY || "";
  const token = env.BIPO_TOKEN || "";

  // Auth injected server-side so the secret never reaches the browser bundle.
  // Service Key (machine-to-machine) takes precedence; falls back to Bearer.
  const authHeaders: Record<string, string> | undefined = serviceKey
    ? { "x-service-key": serviceKey }
    : token
      ? { Authorization: `Bearer ${token}` }
      : undefined;

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
          headers: authHeaders,
        },
      },
    },
  };
});
