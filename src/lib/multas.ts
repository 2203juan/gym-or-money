/**
 * REGLAS DE NEGOCIO — FUENTE DE VERDAD.
 *
 * Estas tablas se copian LITERALMENTE del documento de requerimientos.
 * NO se derivan con una formula ni se interpolan en tiempo de ejecucion:
 * los valores tienen redondeos propios que no salen de una formula lineal exacta.
 *
 * Formato: meta -> { dias_cumplidos: multa }
 */
export const TABLA_MULTAS: Readonly<Record<number, Readonly<Record<number, number>>>> = Object.freeze({
  1: Object.freeze({ 0: 70000, 1: 0 }),
  2: Object.freeze({ 0: 70000, 1: 35000, 2: 0 }),
  3: Object.freeze({ 0: 70000, 1: 50000, 2: 35000, 3: 0 }),
  4: Object.freeze({ 0: 70000, 1: 58000, 2: 46000, 3: 35000, 4: 0 }),
  5: Object.freeze({ 0: 70000, 1: 61250, 2: 52500, 3: 43750, 4: 35000, 5: 0 }),
  6: Object.freeze({ 0: 70000, 1: 63000, 2: 56000, 3: 49000, 4: 42000, 5: 35000, 6: 0 }),
  7: Object.freeze({ 0: 70000, 1: 64167, 2: 58333, 3: 52500, 4: 46667, 5: 40833, 6: 35000, 7: 0 }),
});

export const MULTA_BASE = 70000;
export const META_MIN = 1;
export const META_MAX = 7;

export type ResultadoMulta =
  | { ok: true; monto: number }
  | { ok: false; error: string };

/**
 * Calcula la multa para un marcador dias/meta.
 * - Meta fuera de 1..7 -> error explicito (NUNCA extrapolar).
 * - Dias por encima de la meta -> 0 (no genera credito).
 */
export function calcularMulta(dias: number, meta: number): ResultadoMulta {
  if (!Number.isInteger(dias) || dias < 0) {
    return { ok: false, error: `Dias cumplidos invalidos: ${dias}` };
  }
  if (!Number.isInteger(meta) || meta < META_MIN || meta > META_MAX) {
    return {
      ok: false,
      error: `Meta de ${meta} dias fuera del rango soportado (${META_MIN}-${META_MAX}). ` +
        `No se calcula ninguna multa: agrega la tabla exacta para esa meta antes de procesar.`,
    };
  }
  // Cumplir de mas no genera credito ni compensa otras semanas.
  const efectivos = Math.min(dias, meta);
  const fila = TABLA_MULTAS[meta];
  const monto = fila[efectivos];
  if (monto === undefined) {
    return { ok: false, error: `No hay valor en la tabla para ${efectivos}/${meta}` };
  }
  return { ok: true, monto };
}

/** Formatea un entero COP como $58.000 (separador de miles con punto, sin decimales). */
export function formatoCOP(monto: number): string {
  const n = Math.round(monto);
  const signo = n < 0 ? '-' : '';
  const digitos = String(Math.abs(n));
  const conPuntos = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${conPuntos}`;
}
