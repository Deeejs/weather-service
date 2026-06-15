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
    periods: [{ temperature: 72, shortForecast: "Partly Cloudy" }],
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
