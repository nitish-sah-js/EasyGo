import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`NextTour API running on http://localhost:${env.API_PORT}`);
});
