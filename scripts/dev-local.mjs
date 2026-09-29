// Local dev launcher: keeps temp/cache files on this project's drive (the C: drive on the
// dev machine is full, which silently kills Next.js compiles). Usage: npm run dev:local
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const tmp = path.resolve(process.cwd(), "..", ".tmp");
mkdirSync(tmp, { recursive: true });
const env = { ...process.env, TMP: tmp, TEMP: tmp, TMPDIR: tmp, NEXT_TELEMETRY_DISABLED: "1" };
const child = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "--turbopack", ...process.argv.slice(2)], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
