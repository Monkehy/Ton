import { Pool } from "pg";
import { config } from "./config.js";

export const db = new Pool({
  connectionString: config.DATABASE_URL
});

export async function closeDb(): Promise<void> {
  await db.end();
}
