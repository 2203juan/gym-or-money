/**
 * Lectura tolerante de variables de entorno.
 *
 * Al pegar valores en el panel de Vercel es facil arrastrar comillas o espacios
 * (`TOKEN="123:abc"`). Los archivos .env las quitan, el panel NO: quedan como parte
 * del valor y producen fallos mudos (un 401 en el webhook, una URL malformada).
 * Aqui se limpian, pero se avisa en el log para que el error se corrija de raiz.
 */
const yaAvisado = new Set<string>();

export function env(nombre: string): string | undefined {
  const crudo = process.env[nombre];
  if (crudo === undefined) return undefined;

  let v = crudo.trim();
  if (v.length >= 2 &&
      ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    v = v.slice(1, -1).trim();
  }

  if (v !== crudo && !yaAvisado.has(nombre)) {
    yaAvisado.add(nombre);
    console.warn(
      `[env] ${nombre} traia comillas o espacios de sobra; los ignore. ` +
      `Corrigelo en el panel de variables de entorno para evitar sorpresas.`,
    );
  }
  return v === '' ? undefined : v;
}

/** Igual que env(), pero lanza con un mensaje claro si falta. */
export function envObligatorio(nombre: string): string {
  const v = env(nombre);
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}
