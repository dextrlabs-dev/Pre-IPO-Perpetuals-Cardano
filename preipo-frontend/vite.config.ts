import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function apiProxy(backend: string) {
  return {
    "/api": { target: backend, changeOrigin: true },
    "/health": { target: backend, changeOrigin: true },
    "/openapi.json": { target: backend, changeOrigin: true },
    "/docs": { target: backend, changeOrigin: true },
    "/hl-info": {
      target: "https://api.hyperliquid.xyz",
      changeOrigin: true,
      rewrite: () => "/info",
    },
  } as const;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  /** Where Vite forwards `/api`, `/health`, etc. (Deno backend). */
  const backend = env.VITE_DEV_BACKEND ?? "http://127.0.0.1:8787";
  const proxy = apiProxy(backend);
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { ...proxy },
    },
    /** Without this, `npm run preview` serves static files and /api/* returns 404. */
    preview: {
      port: 4173,
      proxy: { ...proxy },
    },
  };
});
