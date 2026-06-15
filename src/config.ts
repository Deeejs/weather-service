// Loads .env if present (never overrides real env vars).
import "dotenv/config";
import { z } from "zod";

// Env config, validated at startup so misconfig fails loud here, not mid-request.
const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NWS_BASE_URL: z.url().default("https://api.weather.gov"),
  // NWS requires a User-Agent with contact info.
  USER_AGENT: z.string().min(1).default("ts-weather-api (contact@example.com)"),
  NWS_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
});

export type Config = z.infer<typeof EnvSchema>;

export const config: Config = EnvSchema.parse(process.env);
