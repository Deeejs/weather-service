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
