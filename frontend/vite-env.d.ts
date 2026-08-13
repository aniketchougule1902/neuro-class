/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALGOD_SERVER_URL?: string;
  readonly VITE_ALGORAND_PORT?: string;
  readonly VITE_NEUROCLASS_TREASURY_ADDRESS?: string;
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
