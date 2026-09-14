import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';

export const dynamic = 'force-dynamic';

export default async function Persona({ params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioActual())) redirect('/login');
  const { id } = await params;
  const personaId = Number(id);
  if (!Number.isFinite(personaId)) notFound();

  const filas = await q<any>('select * from multas.saldos where id=$1', [personaId]);
  if (!filas.length) notFound();
  const p = filas[0];

  const movimientos = await q<any>(
    `select 'multa' as tipo, se.numero::text as ref, se.fecha_cierre::text as fecha,
            m.monto, m.estado, (m.dias_cumplidos || '/' || m.meta) as detalle
     from multas.multas m join multas.semanas se on se.id = m.semana_id
     where m.persona_id = $1
     union all
     select case when a.tipo='saldo_inicial' then 'saldo_inicial' else 'abono' end,
            a.registrado_por, a.fecha::text,
            case when a.tipo='saldo_inicial' then a.monto else -a.monto end,
            a.estado, coalesce(a.nota,'')
     from multas.abonos a where a.persona_id = $1
     order by fecha desc, ref desc`,
    [personaId],
  );

  return (
    <>
      <header className="barra">
        <Link href="/">← Saldos</Link>
        <span>{p.nombre}</span>
      </header>

      <section className="total">
        <p className="total__etiqueta">{p.saldo < 0 ? 'A favor' : p.saldo === 0 ? 'Al día' : 'Debe'}</p>
        <p className={'total__cifra total__cifra--medio' + (p.saldo < 0 ? ' fila__monto--credito' : '')}>
          {formatoCOP(Math.abs(p.saldo))}
        </p>
        <p className="total__pie">
          {p.saldo_inicial !== 0 ? <span className="marca marca--quieta">Inicial {formatoCOP(p.saldo_inicial)}</span> : null}
          <span className="marca marca--quieta">Multas {formatoCOP(p.total_multas)}</span>
          <span className="marca marca--quieta">Abonos {formatoCOP(p.total_abonos)}</span>
        </p>
      </section>

      <div className="seccion"><h2 className="seccion__t">Movimientos</h2></div>

      {movimientos.map((m: any, k: number) => {
        const anulado = m.estado === 'anulada' || m.estado === 'anulado';
        return (
          <div key={k} className={'movimiento' + (anulado ? ' movimiento--anulado' : '')}>
            <span>
              <span className="movimiento__t">
                {m.tipo === 'multa' ? `Semana ${m.ref} · ${m.detalle}` : null}
                {m.tipo === 'abono' ? 'Abono' : null}
                {m.tipo === 'saldo_inicial' ? 'Saldo inicial migrado' : null}
                {m.estado === 'exenta' ? <span className="etiqueta etiqueta--excusa">Excusa</span> : null}
                {anulado ? <span className="etiqueta etiqueta--anulado">Anulado</span> : null}
              </span>
              <span className="movimiento__d">
                {m.fecha}
                {m.tipo === 'abono' && m.detalle ? ` · ${m.detalle}` : ''}
                {m.tipo === 'abono' ? ` · registró ${m.ref}` : ''}
                {m.tipo === 'saldo_inicial' ? ' · desde Splitwise' : ''}
              </span>
            </span>
            <span className={'movimiento__a' + (m.monto < 0 ? ' movimiento__a--negativo' : '')}>
              {formatoCOP(m.monto)}
            </span>
          </div>
        );
      })}
      {movimientos.length === 0 ? <p className="vacio">Sin movimientos.</p> : null}

      <p className="nota">
        <Link href="/abonos" style={{ textDecoration: 'underline' }}>Registrar un abono</Link>
        {'  ·  '}
        <Link href="/semanas" style={{ textDecoration: 'underline' }}>Corregir una multa</Link>
      </p>
    </>
  );
}
