/**
 * Orden barajado, pero ESTABLE dentro de la semana.
 *
 * La lista de saldos no se ordena por monto: nadie es "el primero" ni "el ultimo".
 * Pero tampoco se baraja en cada carga, porque entonces las filas saltarian en cada
 * refresco y nadie podria encontrarse. El generador se siembra con el numero de
 * semana, asi que:
 *   · los nueve ven exactamente el mismo orden durante toda la semana;
 *   · el orden cambia solo cuando se registra la semana siguiente.
 */

/** mulberry32: PRNG deterministico de 32 bits, corto y de buena distribucion. */
function prng(semilla: number): () => number {
  let a = semilla >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates sembrado. No muta la lista original.
 * Una misma semilla siempre produce el mismo orden.
 */
export function barajarConSemilla<T>(items: readonly T[], semilla: number): T[] {
  const out = items.slice();
  const azar = prng(Math.trunc(semilla) || 1);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
