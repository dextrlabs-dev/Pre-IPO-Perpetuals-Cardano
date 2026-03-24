/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  /** Deno API origin in dev (browser calls this directly; default 8787). */
  readonly VITE_DEV_BACKEND: string;
  /** Override the candle snapshot POST URL (e.g. CORS proxy). */
  readonly VITE_HL_INFO_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
