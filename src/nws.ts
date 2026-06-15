import { z } from "zod";

import { config } from "./config";
import { AppError } from "./errors";

// Runtime schemas for the parts of the NWS responses we consume. Validating the
// external boundary means an upstream shape change fails loudly (-> 502) instead
// of surfacing as a confusing `undefined` deep in the request.
const PointsResponseSchema = z.object({
  properties: z.object({
    forecast: z.url(),
  }),
});

const ForecastPeriodSchema = z.object({
  temperature: z.number(),
  shortForecast: z.string(),
});

const ForecastResponseSchema = z.object({
  properties: z.object({
    periods: z.array(ForecastPeriodSchema).min(1),
  }),
});

export type ForecastPeriod = z.infer<typeof ForecastPeriodSchema>;

// fetch is injectable so tests can pass a fake without hitting the network.
interface NwsClientOptions {
  fetchFn?: typeof fetch;
}

export interface NwsClient {
  getTodaysForecast(lat: number, lon: number): Promise<ForecastPeriod>;
}

export function createNwsClient(opts: NwsClientOptions = {}): NwsClient {
  const fetchFn = opts.fetchFn ?? fetch;

  // Fetch with our User-Agent + timeout. 504 on timeout, 502 otherwise.
  async function nwsFetch(url: string): Promise<Response> {
    try {
      return await fetchFn(url, {
        headers: { "User-Agent": config.USER_AGENT },
        signal: AbortSignal.timeout(config.NWS_TIMEOUT_MS),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AppError("Weather service timed out", 504);
      }
      throw new AppError("Weather service unavailable", 502);
    }
  }

  // Validate a response body against a schema. Any upstream failure — a non-ok
  // status or an unexpected shape — becomes a 502.
  async function parseBody<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
    if (!res.ok) {
      throw new AppError("Weather service unavailable", 502);
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      throw new AppError(
        "Weather service returned an unexpected response",
        502,
      );
    }
    return parsed.data;
  }

  async function getTodaysForecast(
    lat: number,
    lon: number,
  ): Promise<ForecastPeriod> {
    // First hop: resolve coordinates to a forecast URL. A 404 here means NWS
    // has no forecast for those coordinates (e.g. outside the US), which is a
    // client error rather than an upstream failure.
    const pointsRes = await nwsFetch(
      `${config.NWS_BASE_URL}/points/${lat},${lon}`,
    );
    if (pointsRes.status === 404) {
      throw new AppError("No forecast available for those coordinates", 404);
    }
    const points = await parseBody(pointsRes, PointsResponseSchema);

    // Second hop: fetch the actual forecast periods.
    const forecastRes = await nwsFetch(points.properties.forecast);
    const forecast = await parseBody(forecastRes, ForecastResponseSchema);

    // Shortcut: "today" = first period (may be "Tonight" later in the day).
    // The schema's .min(1) guarantees at least one period exists.
    return forecast.properties.periods[0]!;
  }

  return { getTodaysForecast };
}
