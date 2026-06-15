import express, { type ErrorRequestHandler, type Express } from "express";
import { z, ZodError } from "zod";

import { AppError } from "./errors";
import { getForecast } from "./forecast";
import { createNwsClient, type NwsClient } from "./nws";

// Query params arrive as strings, so coordinates are coerced to numbers and
// bound-checked. z.coerce.number() already rejects non-numeric input (NaN).
const WeatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

// Centralized error handler. Express 5 forwards async throws here automatically,
// so the route handler can just validate/throw and skip try/catch.
//   ZodError -> 400 (the client sent bad input)
//   AppError -> its declared status (e.g. 404, 502, 504)
//   anything else -> 500
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ error: message });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "something went wrong" });
};

// Builds the Express app. The NWS client is injected (defaulting to the real
// one) so tests can drive the whole app over supertest with a fake client —
// no network, and without binding a port the way index.ts does.
export function createApp(client: NwsClient = createNwsClient()): Express {
  const app = express();

  app.get("/forecast", async (req, res) => {
    const { lat, lon } = WeatherQuerySchema.parse(req.query);
    res.json(await getForecast(client, lat, lon));
  });

  app.use(errorHandler);
  return app;
}
