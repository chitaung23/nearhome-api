import path from "node:path";

export type AppConfig = {
  port: number;
  databasePath: string;
  webOrigin: string;
  enableDemoSeed: boolean;
};

export function getConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 4000),
    databasePath: path.resolve(process.env.DATABASE_PATH ?? "./data/property.sqlite"),
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    enableDemoSeed: process.env.ENABLE_DEMO_SEED === "true",
  };
}
