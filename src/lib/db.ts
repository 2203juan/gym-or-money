import { Pool, type PoolClient } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __multasPool: Pool | undefined;
}

function crearPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Falta la variable de entorno DATABASE_URL');
  return new Pool({
    connectionString,
    max: 4,
    ssl: /localhost|127\.0\.0\.1|^\/|host=\//.test(connectionString) ? false : { rejectUnauthorized: false },
    options: '-c search_path=multas,public',
  });
}

/** Pool perezoso: no se conecta al importar el modulo (necesario para el build). */
export function getPool(): Pool {
  return (global.__multasPool ??= crearPool());
}

export const pool = new Proxy({} as Pool, {
  get(_t, prop: string | symbol) {
    const p = getPool() as any;
    const v = p[prop];
    return typeof v === 'function' ? v.bind(p) : v;
  },
});

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

/** Ejecuta fn dentro de una transaccion. Hace rollback ante cualquier error. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function bitacora(
  c: PoolClient | null,
  accion: string,
  autor: string,
  detalle: Record<string, unknown> = {},
): Promise<void> {
  const sql = 'insert into multas.bitacora (accion, autor, detalle) values ($1,$2,$3)';
  const params = [accion, autor, JSON.stringify(detalle)];
  if (c) await c.query(sql, params);
  else await getPool().query(sql, params);
}
