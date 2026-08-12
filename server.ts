import { startBackendServer } from "./backend/server";

startBackendServer().catch((err) => {
  console.error("Failed to start backend server:", err);
});
