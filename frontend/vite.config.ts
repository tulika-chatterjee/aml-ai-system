import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/** Vite `base` must be `/` or a path with leading and trailing slashes. */
function normalizeBase(path: string | undefined): string {
  if (!path?.trim() || path === "/") return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeBase(env.VITE_BASE_PATH);

  return {
    plugins: [react()],
    base,
    server: {
      port: 5173,
      proxy: {
        "/api": "http://127.0.0.1:8000",
        "/docs": "http://127.0.0.1:8000",
        "/openapi.json": "http://127.0.0.1:8000",
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": "http://127.0.0.1:8000",
        "/docs": "http://127.0.0.1:8000",
        "/openapi.json": "http://127.0.0.1:8000",
      },
    },
  };
});
