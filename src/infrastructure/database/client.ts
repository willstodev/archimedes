import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";
import { loadConfig } from "../../shared/config/env.js";

export function createDatabase() {
  const config = loadConfig();
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

  return {
    db: drizzle(pool, { schema }),
    pool
  };
}
