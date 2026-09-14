/**
 * Parser del mensaje de resumen semanal.
 *
 * Formato esperado:
 *   Semana # 32
 *
 *   Naranjo: 4/4 ✅
 *   Hoyos: 2/3
 *   ...
 */

/** Checks que significan UNICAMENTE "cumplio". No son excusa. */
const CHECKS = new Set(['\u2705', '\u2714', '\u2611']);

/** Quita selectores de variacion (U+FE00–U+FE0F), ZWJ (U+200D) y keycaps. */
export function limpiarEmojis(texto: string): string {
  return texto.replace(/[\u200D\uFE00-\uFE0F\u20E3]/g, '');
}

/** minusculas + sin tildes + espacios colapsados */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type LineaParseada = {
  nombreCrudo: string;
  nombreNormalizado: string;
  dias: number;
  meta: number;
  /** emojis presentes tras el marcador, ya limpios de selectores/ZWJ */
  emojis: string;
  /** true si hay al menos un emoji que NO es un check => excusa aceptada por el grupo */
  esExcusa: boolean;
  /** true si solo hay checks */
  tieneCheck: boolean;
};

export type MensajeParseado =
  | { esResumen: false }
  | { esResumen: true; semana: number | null; lineas: LineaParseada[] };

const RE_SEMANA = /semana\s*#?\s*(\d{1,4})/i;
// Nombre: letras/espacios/puntos, luego ":", luego n/m, luego cola opcional
const RE_LINEA = /^\s*([^\d:][^:]*?)\s*:\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*(.*)$/u;

export function parsearMensaje(textoOriginal: string): MensajeParseado {
  const texto = limpiarEmojis(textoOriginal ?? '');
  const lineas: LineaParseada[] = [];

  for (const rawLinea of texto.split(/\r?\n/)) {
    const m = RE_LINEA.exec(rawLinea);
    if (!m) continue;
    const nombreCrudo = m[1].trim();
    if (!nombreCrudo) continue;
    // Evita capturar la propia cabecera "Semana # 32" si alguien la escribe con ":"
    if (/^semana\b/i.test(nombreCrudo)) continue;

    const dias = Number(m[2]);
    const meta = Number(m[3]);
    const cola = (m[4] ?? '').trim();

    // Todo lo que no sea espacio en la cola cuenta como emoji/marca
    const marcas = Array.from(cola).filter((c) => c.trim() !== '');
    const tieneCheck = marcas.some((c) => CHECKS.has(c));
    const esExcusa = marcas.some((c) => !CHECKS.has(c));

    lineas.push({
      nombreCrudo,
      nombreNormalizado: normalizarNombre(nombreCrudo),
      dias,
      meta,
      emojis: marcas.join(''),
      esExcusa,
      tieneCheck,
    });
  }

  // Sin lineas validas => no es el mensaje de resumen, se ignora en silencio
  if (lineas.length === 0) return { esResumen: false };

  const ms = RE_SEMANA.exec(texto);
  const semana = ms ? Number(ms[1]) : null;

  return { esResumen: true, semana, lineas };
}
