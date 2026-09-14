/**
 * Anillo de cumplimiento: dias hechos sobre la meta, igual que el anillo de
 * actividad. Verde si cumplio, naranja si le falto, rojo si no hizo nada.
 * Componente puro, sin estado: se renderiza en el servidor.
 */
type Props = {
  dias: number;
  meta: number;
  tam?: number;
  /** Muestra el marcador dentro del anillo */
  conTexto?: boolean;
};

export function colorDe(dias: number, meta: number): string {
  if (meta <= 0) return 'var(--label-3)';
  if (dias >= meta) return 'var(--verde)';
  if (dias <= 0) return 'var(--rojo)';
  return 'var(--naranja)';
}

export default function Anillo({ dias, meta, tam = 34, conTexto = false }: Props) {
  const pct = meta > 0 ? Math.min(Math.max(dias / meta, 0), 1) : 0;
  const color = colorDe(dias, meta);
  const grosor = tam >= 48 ? 4.2 : 5.2;
  // circunferencia de r=15.5 en el viewBox de 36 => 97.4
  const dash = (pct * 97.4).toFixed(2);
  const cumplio = meta > 0 && dias >= meta;
  // Con 0 dias no se dibuja el arco (un dash de 0 con punta redonda deja un punto
  // que parece un error); en su lugar el aro de fondo se tiñe de rojo.
  const cero = meta > 0 && dias <= 0;

  return (
    /* El tamaño viaja como variable CSS para que una media query lo pueda
       reducir en pantallas angostas sin tocar el componente. */
    <span
      className={'anilloCaja' + (tam >= 48 ? ' anilloCaja--grande' : '')}
      style={{ ['--tam-base' as string]: `${tam}px` }}
    >
      <svg className="anillo" viewBox="0 0 36 36" role="img" aria-label={`${dias} de ${meta} días`}>
        <circle
          className={'anillo__b' + (cero ? ' anillo__b--cero' : '')}
          cx="18" cy="18" r="15.5" strokeWidth={grosor}
        />
        {pct > 0 ? (
          <circle
            className="anillo__f" cx="18" cy="18" r="15.5"
            strokeWidth={grosor} stroke={color}
            strokeDasharray={`${dash} 100`}
          />
        ) : null}
      </svg>
      {cumplio ? (
        <span className="anilloCaja__t" style={{ color }}>✓</span>
      ) : conTexto ? (
        <span className="anilloCaja__t" style={{ color }}>{dias}/{meta}</span>
      ) : null}
    </span>
  );
}
