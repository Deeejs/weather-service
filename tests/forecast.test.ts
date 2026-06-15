import { describe, expect, it } from "vitest";

import { getForecast } from "../src/forecast";
import type { NwsClient } from "../src/nws";

// A fake client lets us test orchestration with no network and no Express.
function fakeClient(temperature: number, shortForecast: string): NwsClient {
  return {
    getTodaysForecast: async () => ({ temperature, shortForecast }),
  };
}

describe("getForecast", () => {
  it("maps the client's period into the response shape and characterizes temp", async () => {
    const result = await getForecast(fakeClient(85, "Sunny"), 40, -105);
    expect(result).toEqual({
      shortForecast: "Sunny",
      temperature: 85,
      temperatureType: "hot",
    });
  });

  it("propagates errors from the client", async () => {
    const client: NwsClient = {
      getTodaysForecast: async () => {
        throw new Error("boom");
      },
    };
    await expect(getForecast(client, 40, -105)).rejects.toThrow("boom");
  });
});
