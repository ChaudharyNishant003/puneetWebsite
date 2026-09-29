// Local Postgres for development without Docker (data lives in ./.pgdata on this drive).
// Usage: npm run db:local   (keep it running in its own terminal)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".pgdata");
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "puneet",
  password: "puneet_dev",
  port: 5434,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  persistent: true,
});

const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("puneet").catch((e) => { if (e.code !== "42P04") throw e; });
console.log("Postgres ready on postgresql://puneet:***@localhost:5434/puneet (Ctrl+C to stop)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
