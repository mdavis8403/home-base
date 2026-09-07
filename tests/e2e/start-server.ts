// Isolated, in-memory PostgreSQL for browser tests. Never imported by application code.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { spawn } from "node:child_process";
const db = await PGlite.create();
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 54329,
  maxConnections: 10,
});
await server.start();
const env = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54329/postgres",
  APP_ORIGIN: "http://localhost:3101",
  FAMILY_ACCESS_PHRASE: "isolated-browser-test-family",
  MIA_PASSCODE: "111111",
  MOM_PASSCODE: "222222",
  DAD_PASSCODE: "333333",
};
async function setup(file: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", file], {
      env,
      stdio: "inherit",
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} failed`)),
    );
    child.on("error", reject);
  });
}
await setup("scripts/migrate.ts");
await setup("scripts/migrate.ts"); // A second run must be safe and do nothing.
await setup("scripts/seed.ts");
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", "3101"],
  { env, stdio: "inherit" },
);
async function stop() {
  child.kill("SIGTERM");
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", () => {
  void stop();
});
