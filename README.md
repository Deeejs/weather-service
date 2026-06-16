# Weather Service

An HTTP service that accepts latitude/longitude coordinates and returns today's
short forecast plus a temperature characterization (`hot` / `moderate` / `cold`),
using the [National Weather Service API](https://api.weather.gov) as its data
source.

## Requirements

- Node.js >= 18 (uses the global `fetch` and `AbortSignal.timeout`)

## Run

```bash
npm install
npm run build
npm start
```

The server listens on port `3000` by default. For local development with
auto-reload of TypeScript, use `npm run dev`.

## Configuration

All settings have sensible defaults and are validated at startup (the process
exits immediately on bad config rather than failing mid-request). Override via
environment variables or a `.env` file (see `.env.example`):

| Variable         | Default                                | Notes                                          |
| ---------------- | -------------------------------------- | ---------------------------------------------- |
| `PORT`           | `3000`                                 | HTTP port                                      |
| `NWS_BASE_URL`   | `https://api.weather.gov`              | NWS API base URL                               |
| `USER_AGENT`     | `ts-weather-api (contact@example.com)` | NWS asks for a real contact — **set your own** |
| `NWS_TIMEOUT_MS` | `5000`                                 | Per-request timeout to the NWS API             |

## API

### `GET /forecast`

Query parameters:

| Param | Type  | Range       | Required |
| ----- | ----- | ----------- | -------- |
| `lat` | float | -90 to 90   | yes      |
| `lon` | float | -180 to 180 | yes      |

Example:

```bash
curl "http://localhost:3000/forecast?lat=39.7456&lon=-97.0892"
```

```json
{
  "shortForecast": "Sunny",
  "temperature": 80,
  "temperatureType": "moderate"
}
```

The raw `temperature` (°F) is included alongside the characterization so the
classification is transparent to the caller.

### Temperature thresholds

| Category   | Range (°F) |
| ---------- | ---------- |
| `cold`     | < 50       |
| `moderate` | 50 – 80    |
| `hot`      | > 80       |

### Error responses

Errors return `{ "error": "<message>" }` with a status code chosen to reflect
the cause — deliberately _not_ a blanket 500:

| Status | When                                                            |
| ------ | --------------------------------------------------------------- |
| `400`  | Missing or out-of-range `lat`/`lon`                             |
| `404`  | NWS has no forecast for those coordinates (e.g. outside the US) |
| `502`  | NWS is unreachable or returned an unexpected/invalid response   |
| `504`  | NWS request timed out                                           |
| `500`  | Unexpected internal error                                       |

## Design notes

**On structure.** For a multi-endpoint service I'd group by feature so it stays
maintainable as it grows — roughly:

```
src/
  integrations/
    nws/
      client.ts
      nws.schemas.ts
  middleware/
    errorHandler.ts
  weather/
    handler.ts
    routes.ts
    service.ts
    temperature.ts
    weather.schemas.ts
  app.ts
  config.ts
  errors.ts
  index.ts
```

With a single endpoint that scaffolding is more overhead than payoff, so I kept
the layout flat but still split the things that change for different reasons:

- **Layered, but flat.** The pure temperature rule (`temperature.ts`), the NWS
  integration (`nws.ts`), the orchestration (`forecast.ts`), and the HTTP wiring
  (`app.ts`) stay separate.
- **Testable by design.** The NWS client is passed in rather than hardcoded, so
  tests swap in a fake and run with no network calls. And the app is built
  separately from the line that starts the server, so tests can hit every route
  in memory — no real port to open.
- **Validated boundaries.** Inbound params and outbound NWS responses are both
  validated with `zod`, so an upstream shape change fails loudly as a `502`
  rather than leaking `undefined` into the response.

## Tests

```bash
npm test
```

Covers the temperature rule (boundaries), the orchestration and NWS client via
injected fakes, and the HTTP layer end-to-end with `supertest`.

## Shortcuts and assumptions

Given the time box, the following were scoped out — most would change for a
production deployment:

- **US coordinates only.** NWS covers the US and territories; coordinates
  outside coverage return a clean `404` rather than an error.
- **"Today" = the first forecast period.** Depending on the time of day this may
  be the daytime period or "Tonight"/"This Afternoon".
- **No caching.** Each request makes two NWS calls; the `/points` lookup is
  stable and could be cached.
- **No retries / backoff** on transient NWS failures.
- **No rate limiting.** The service doesn't throttle requests or back off on NWS
  limits; caching `/points` would be the first step to reduce upstream load.
- **Logging** uses `console` rather than a structured logger.
- **Thresholds are hardcoded.** In production they'd likely be configurable.
