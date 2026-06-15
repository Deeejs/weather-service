import { createApp } from "./app";
import { config } from "./config";

// Server startup only — the app itself is built in app.ts so it can be tested
// without binding a port.
createApp().listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
