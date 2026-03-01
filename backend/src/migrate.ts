import { access, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

async function findSchemaFile(): Promise<string> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const cwd = process.cwd();
  const candidates = [
    resolve(currentDir, "../BACKEND_SCHEMA_V1.sql"),   // dist/ → backend/
    resolve(currentDir, "../../BACKEND_SCHEMA_V1.sql"), // src/ → backend/
    resolve(currentDir, "../../../BACKEND_SCHEMA_V1.sql"),
    resolve(cwd, "BACKEND_SCHEMA_V1.sql"),
    resolve(cwd, "backend/BACKEND_SCHEMA_V1.sql"),
    resolve(cwd, "backend/../BACKEND_SCHEMA_V1.sql")
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("BACKEND_SCHEMA_V1.sql not found. Tried: " + candidates.join(", "));
}

export async function ensureSchema(log?: { info: (a: unknown, b?: string) => void }): Promise<void> {
  const schemaPath = await findSchemaFile();
  if (log) log.info({ schemaPath }, "running schema");
  const sql = await readFile(schemaPath, "utf8");
  await db.query(sql);
}
