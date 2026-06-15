import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { AppError } from "../src/errors";
import type { NwsClient } from "../src/nws";

const okClient: NwsClient = {
  getTodaysForecast: async () => ({
    temperature: 45,
    shortForecast: "Light Snow",
  }),
};

// End-to-end through Express via supertest, with a fake client injected into
// createApp — no network, no listening port.
describe("GET /forecast", () => {
  it("returns 200 with the forecast for valid coordinates", async () => {
    const res = await request(createApp(okClient)).get(
      "/forecast?lat=40&lon=-105",
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      shortForecast: "Light Snow",
      temperature: 45,
      temperatureType: "cold",
    });
  });

  it("returns 400 when coordinates are missing or out of range", async () => {
    const res = await request(createApp(okClient)).get("/forecast?lat=999");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("surfaces an AppError from the client with its status code", async () => {
    const failing: NwsClient = {
      getTodaysForecast: async () => {
        throw new AppError("No forecast available for those coordinates", 404);
      },
    };
    const res = await request(createApp(failing)).get("/forecast?lat=0&lon=0");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("No forecast");
  });
});
