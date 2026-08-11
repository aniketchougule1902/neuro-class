import { startBackendServer } from "./src/backend/server";

startBackendServer().catch((err) => {
  console.error("Failed to start backend server:", err);
});
