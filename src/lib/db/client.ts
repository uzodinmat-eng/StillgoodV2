import fs from "node:fs";
import path from "node:path";

type SqlFn = {
  unsafe: (query: string, params?: unknown[]) => Promise<unknown>;
};

type PostgresHandle = {
  kind: "postgres";
  sql: SqlFn;
};

type PgliteHandle = {
  kind: "pglite";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pglite: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>; exec: (sql: string) => Promise<unknown> };
};

type DbHandle = PostgresHandle | PgliteHandle;

const globalForDb = globalThis as typeof globalThis & {
  stillgoodDb?: DbHandle;
  stillgoodDbReady?: Promise<DbHandle>;
};

function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  return url && url.trim().length > 0 ? url : undefined;
}

async function openDb(): Promise<DbHandle> {
  const url = databaseUrl();
  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, {
      max: 1,
      ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    });
    return { kind: "postgres", sql: sql as unknown as SqlFn };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".data", "stillgood");
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  return { kind: "pglite", pglite };
}

function readSqlFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function applySql(handle: DbHandle, sql: string): Promise<void> {
  if (handle.kind === "postgres") {
    await handle.sql.unsafe(sql);
    return;
  }
  await handle.pglite.exec(sql);
}

async function rawQuery<T = Record<string, unknown>>(
  handle: DbHandle,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  if (handle.kind === "postgres") {
    const rows = await handle.sql.unsafe(text, params);
    return (Array.isArray(rows) ? rows : []) as T[];
  }
  const result = await handle.pglite.query(text, params);
  return (result.rows || []) as T[];
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const handle = await getDb();
  return rawQuery<T>(handle, text, params);
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function execute(text: string, params: unknown[] = []): Promise<void> {
  await query(text, params);
}

function migrationFiles(): string[] {
  const dir = path.join(process.cwd(), "supabase/migrations");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => path.join("supabase/migrations", name));
}

async function migrate(handle: DbHandle): Promise<void> {
  // Serialize migrations across serverless instances so concurrent cold starts
  // cannot race each other against the shared Supabase connection pool.
  await rawQuery(handle, `select pg_advisory_lock(918273645)`);
  try {
    for (const relativePath of migrationFiles()) {
      await applySql(handle, readSqlFile(relativePath));
    }
  } finally {
    await rawQuery(handle, `select pg_advisory_unlock(918273645)`);
  }

  const table = (
    await rawQuery<{ exists: string | null }>(
      handle,
      `select to_regclass('public.stores') as exists`
    )
  )[0];
  if (!table?.exists) {
    throw new Error("Stillgood schema did not apply.");
  }

  const countRow = (
    await rawQuery<{ n: number | string }>(
      handle,
      `select count(*)::int as n from public.stores`
    )
  )[0];
  const n = Number(countRow?.n ?? 0);
  if (n === 0) {
    const seedSql = readSqlFile("supabase/seed.sql");
    await applySql(handle, seedSql);
  }
}

export async function getDb(): Promise<DbHandle> {
  if (globalForDb.stillgoodDb) return globalForDb.stillgoodDb;
  if (!globalForDb.stillgoodDbReady) {
    globalForDb.stillgoodDbReady = (async () => {
      const handle = await openDb();
      await migrate(handle);
      globalForDb.stillgoodDb = handle;
      return handle;
    })();
  }
  return globalForDb.stillgoodDbReady;
}

export function isoTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date().toISOString();
}

export function dateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return String(value);
}

export function asInt(value: unknown): number {
  return Math.round(Number(value) || 0);
}
