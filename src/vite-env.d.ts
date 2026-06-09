/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_MODE?: "mock" | "real";
  readonly VITE_BIPO_AGENT_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
