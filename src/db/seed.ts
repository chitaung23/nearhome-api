import { getConfig } from "../config.js";
import { openDatabase } from "./database.js";
import { seedDemoData } from "./seed-data.js";

const config = getConfig();
const database = openDatabase(config.databasePath);
seedDemoData(database);
database.close();
console.log(`Seeded demo catalog at ${config.databasePath}`);
