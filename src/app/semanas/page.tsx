import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';
import Semana from './semana';

export const dynamic = 'force-dynamic';

type Fila = {
  id: number; numero: number; fecha_cierre: string; estado: string;
  procesada_por: string; anulada_por: string | null; motivo_anulacion: string | null;
  total: number;
  detalle: { id: number; nombre: string; dias: number; meta: number; monto: number; estado: string }[];
};

export default async function Semanas({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  if (!(await usuarioActual())) redirect('/login');
  const { ok } = await searchParams;

  const filas = await q<Fila>(`
    select s.id, s.numero, to_char(s.fecha_cierre,'DD Mon YYYY') as fecha_cierre, s.estado,
           s.procesada_por, s.anulada_por, s.motivo_anulacion,
           coalesce(sum(m.monto) filter (where m.estado='cobrada'),0)::int as total,
           coalesce(jsonb_agg(jsonb_build_object(
             'id', m.id, 'nombre', p.nombre, 'dias', m.dias_cumplidos, 'meta', m.meta,
             'monto', m.monto, 'estado', m.estado
           ) order by p.nombre) filter (where m.id is not null), '[]'::jsonb) as detalle
    from multas.semanas s
    left join multas.multas m on m.semana_id = s.id
    left join multas.personas p on p.id = m.persona_id
    group by s.id
    order by s.numero desc, s.id desc
  `);

  const vivas = filas.filter((f) => f.estado === 'procesada');
  const total = vivas.reduce((s, f) => s + f.total, 0);

  return (
    <>
      <header className="barra">
        <Link href="/">← Saldos</Link>
        <span>Semanas</span>
      </header>

      <section className="total">
        <p className="total__etiqueta">Multado en total</p>
        <p className="total__cifra total__cifra--medio">{formatoCOP(total)}</p>
        <p className="total__pie">
          <span className="marca">{vivas.length} semanas</span>
          <span>Nada se borra: anular deja rastro</span>
        </p>
      </section>

      {ok ? <div className="aviso aviso--ok" style={{ marginTop: 14 }}>Semana {ok} registrada y publicada en Telegram.</div> : null}

      {filas.length === 0 ? <p className="vacio">Todavía no hay semanas registradas.</p> : null}
      {filas.map((s) => <Semana key={s.id} s={{ ...s, totalFmt: formatoCOP(s.total) }} />)}
    </>
  );
}
