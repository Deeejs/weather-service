import { describe, expect, it } from "vitest";

import { createNwsClient } from "../src/nws";

// Valid upstream payloads for the two-hop /points -> /forecast flow.
const POINTS_OK = {
  properties: {
    forecast: "https://api.weather.gov/gridpoints/BOU/1,2/forecast",
  },
};
const FORECAST_OK = {
  properties: {
    periods: [
      { temperature: 72, temperatureUnit: "F", shortForecast: "Partly Cloudy" },
    ],
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Builds a fake fetch that answers the points hop, then the forecast hop.
function fakeFetch(
  pointsRes: Response,
  forecastRes: Response = json(FORECAST_OK),
): typeof fetch {
  return (async (url: string | URL | Request) => {
    return String(url).includes("/points/") ? pointsRes : forecastRes;
  }) as unknown as typeof fetch;
}

describe("createNwsClient.getTodaysForecast", () => {
  it("returns the first forecast period on the happy path", async () => {
    const client = createNwsClient({ fetchFn: fakeFetch(json(POINTS_OK)) });
    const period = await client.getTodaysForecast(1, 2);
    expect(period).toEqual({ temperature: 72, shortForecast: "Partly Cloudy" });
  });

  it("maps a 404 from /points to a 404 AppError", async () => {
    const client = createNwsClient({ fetchFn: fakeFetch(json({}, 404)) });
    await expect(client.getTodaysForecast(1, 2)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("maps a 5xx from /points to a 502 AppError", async () => {
    const client = createNwsClient({ fetchFn: fakeFetch(json({}, 503)) });
    await expect(client.getTodaysForecast(1, 2)).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it("maps a malformed upstream body to a 502 AppError", async () => {
    const client = createNwsClient({
      fetchFn: fakeFetch(json({ properties: {} })),
    });
    await expect(client.getTodaysForecast(1, 2)).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it("maps an unexpected temperature unit to a 502 AppError", async () => {
    // Our thresholds are °F, so a Celsius (or any non-"F") period is treated as
    // an unexpected response rather than silently mischaracterized.
    const celsius = {
      properties: {
        periods: [
          { temperature: 22, temperatureUnit: "C", shortForecast: "Clear" },
        ],
      },
    };
    const client = createNwsClient({
      fetchFn: fakeFetch(json(POINTS_OK), json(celsius)),
    });
    await expect(client.getTodaysForecast(1, 2)).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it("maps a failure on the forecast hop to a 502 AppError", async () => {
    // The points hop succeeds; the forecast hop then returns a 5xx.
    const client = createNwsClient({
      fetchFn: fakeFetch(json(POINTS_OK), json({}, 503)),
    });
    await expect(client.getTodaysForecast(1, 2)).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it("maps a fetch timeout to a 504 AppError", async () => {
    const timeoutFetch = (async () => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    }) as unknown as typeof fetch;
    const client = createNwsClient({ fetchFn: timeoutFetch });
    await expect(client.getTodaysForecast(1, 2)).rejects.toMatchObject({
      statusCode: 504,
    });
  });
});
