import pino from "pino";

import { loadConfig } from "../../shared/config/env.js";

export function createLogger() {
  const config = loadConfig();

  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: ["DATABASE_URL", "*.password", "*.token", "*.cookie", "*.authorization"],
      censor: "[redacted]"
    }
  });
}
