import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url().default("postgres://applies:change-me@127.0.0.1:5432/archimedes"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
