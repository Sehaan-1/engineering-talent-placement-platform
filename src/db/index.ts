import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsDb?: ReturnType<typeof drizzlePg>;
  __arenaNextJsPool?: any;
  __arenaPgliteClient?: PGlite;
};

let db: ReturnType<typeof drizzlePg>;
let pool: { query: (text: string, params?: any[]) => Promise<any> };

if (databaseUrl) {
  const pgPool =
    globalForDb.__arenaNextJsPool ??
    new Pool({
      connectionString: databaseUrl,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPool = pgPool;
  }
  pool = pgPool;
  db = drizzlePg(pgPool);
} else {
  const dataDir = process.env.VERCEL ? "/tmp/.pglite_data" : "./.pglite_data";
  const pidFile = path.resolve(path.join(dataDir, "postmaster.pid"));
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }
  const pglite =
    globalForDb.__arenaPgliteClient ??
    new PGlite(dataDir);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaPgliteClient = pglite;
  }
  pool = {
    async query(text: string, params?: any[]) {
      if (params && params.length > 0) {
        return pglite.query(text, params);
      }
      return pglite.exec(text);
    },
  };
  db = drizzlePgLite(pglite) as unknown as ReturnType<typeof drizzlePg>;
}

export { db, pool };
