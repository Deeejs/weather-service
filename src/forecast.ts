import type { NwsClient } from "./nws";
import { characterize, type TemperatureType } from "./temperature";

// The shape we return to clients. A plain type (not a zod schema) since we
// construct it ourselves and don't need to validate our own output.
export interface ForecastResult {
  shortForecast: string;
  temperature: number;
  temperatureType: TemperatureType;
}

// Orchestrates the NWS client + pure characterization. The client is injected,
// so this is testable with a fake — no network, no Express.
export async function getForecast(
  client: NwsClient,
  lat: number,
  lon: number,
): Promise<ForecastResult> {
  const today = await client.getTodaysForecast(lat, lon);
  return {
    shortForecast: today.shortForecast,
    temperature: today.temperature,
    temperatureType: characterize(today.temperature),
  };
}
