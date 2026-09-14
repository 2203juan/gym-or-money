import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'multas_sesion';

function secreto(): string {
  const s = process.env.CLAVE_GRUPO;
  if (!s) throw new Error('Falta la variable de entorno CLAVE_GRUPO');
  return s;
}

function firmar(valor: string): string {
  return createHmac('sha256', secreto()).update(valor).digest('hex');
}

export function claveCorrecta(intento: string): boolean {
  const a = Buffer.from(firmar(intento));
  const b = Buffer.from(firmar(secreto()));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Crea la cookie de sesion con el nombre de quien entra (para la bitacora). */
export async function iniciarSesion(nombre: string): Promise<void> {
  const payload = Buffer.from(nombre, 'utf8').toString('base64url');
  const valor = `${payload}.${firmar(payload)}`;
  const jar = await cookies();
  jar.set(COOKIE, valor, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Devuelve el nombre del usuario en sesion, o null. */
export async function usuarioActual(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf('.');
  if (i < 0) return null;
  const payload = raw.slice(0, i);
  const firma = raw.slice(i + 1);
  const esperada = firmar(payload);
  if (firma.length !== esperada.length) return null;
  if (!timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    return Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

/** Igual que usuarioActual pero lanza si no hay sesion. Usar en server actions. */
export async function exigirSesion(): Promise<string> {
  const u = await usuarioActual();
  if (!u) throw new Error('Sesion no valida. Vuelve a entrar con la clave del grupo.');
  return u;
}
