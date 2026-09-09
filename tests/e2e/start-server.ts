import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
const port = process.argv[2] || "3101";
const configured = port === "3101";
const folder = await mkdtemp(join(tmpdir(), "homebase-cloudflare-e2e-"));
const config = join(folder, "wrangler.json");
await writeFile(
  config,
  JSON.stringify({
    name: `home-base-test-${port}`,
    main: resolve(".open-next/worker.js"),
    compatibility_date: "2026-09-08",
    compatibility_flags: ["nodejs_compat"],
    assets: {
      directory: resolve(".open-next/assets"),
      binding: "ASSETS",
      html_handling: "none",
    },
    vars: {
      APP_ORIGIN: `http://localhost:${port}`,
      FAMILY_ACCESS_PHRASE: "testonly",
      ADMIN_ACCESS_KEY: "test-admin-key-only",
    },
    ...(configured
      ? {
          d1_databases: [
            {
              binding: "DB",
              database_name: "test-db",
              database_id: "local-only",
              migrations_dir: resolve("db/d1"),
            },
          ],
          r2_buckets: [{ binding: "FAMILY_MEDIA", bucket_name: "test-media" }],
        }
      : {}),
  }),
);
await mkdir(".wrangler", { recursive: true });
await writeFile(
  `.wrangler/e2e-${port}.json`,
  JSON.stringify({ config, persist: join(folder, "state") }),
);
const env = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
};
const args = ["node_modules/wrangler/bin/wrangler.js"];
const run = (extra: string[]) =>
  spawn(process.execPath, [...args, ...extra, "--config", config], {
    env,
    stdio: "inherit",
  });
if (configured)
  for (let i = 0; i < 2; i++)
    await new Promise<void>((resolve, reject) => {
      const p = run([
        "d1",
        "migrations",
        "apply",
        "DB",
        "--local",
        "--persist-to",
        join(folder, "state"),
      ]);
      p.on("exit", (c) =>
        c === 0 ? resolve() : reject(new Error("Test migrations failed")),
      );
      p.on("error", reject);
    });
const child = run([
  "dev",
  "--ip",
  "127.0.0.1",
  "--port",
  port,
  "--persist-to",
  join(folder, "state"),
]);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  await rm(folder, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", stop);
