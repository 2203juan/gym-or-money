/**
 * Codigo de discos de la IWF aplicado al peso de una multa.
 *
 * En competencia los bumpers son rojo 25 kg, azul 20, amarillo 15, verde 10 y
 * blanco 5, para que un juez lea la carga sin leer numeros. Aqui el canto de
 * color dice lo mismo de una multa: que tan pesada es, de un vistazo.
 */
export type Disco = 'p25' | 'p20' | 'p15' | 'p10' | 'ninguno';

export const TRAMOS: { disco: Exclude<Disco, 'ninguno'>; desde: number; texto: string }[] = [
  { disco: 'p25', desde: 70000, texto: '70.000' },
  { disco: 'p20', desde: 50000, texto: '50 a 69 mil' },
  { disco: 'p15', desde: 40000, texto: '40 a 49 mil' },
  { disco: 'p10', desde: 1,     texto: '35.000' },
];

/** Devuelve el disco que corresponde al monto. Sin multa => 'ninguno'. */
export function discoDeMulta(monto: number, estado: string = 'cobrada'): Disco {
  if (estado !== 'cobrada' || monto <= 0) return 'ninguno';
  for (const t of TRAMOS) if (monto >= t.desde) return t.disco;
  return 'ninguno';
}
