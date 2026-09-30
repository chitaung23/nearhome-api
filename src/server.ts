import { createApp } from "./app.js";
import { getConfig } from "./config.js";
import { openDatabase } from "./db/database.js";
import { seedDemoData } from "./db/seed-data.js";

const config = getConfig();
const database = openDatabase(config.databasePath);
if (config.enableDemoSeed) seedDemoData(database);

const server = createApp(database, config.webOrigin).listen(config.port, () => {
  console.log(`Property Portal API listening on http://localhost:${config.port}`);
});

function shutdown(): void {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
