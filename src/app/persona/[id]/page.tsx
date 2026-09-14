import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ChevronLeft, Flame, PieChart } from 'lucide-react';
import { usuarioActual } from '@/lib/auth';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';

export const dynamic = 'force-dynamic';

const miles = (n: number) => Math.round(Math.abs(n) / 1000);

export default async function Persona({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/login');
  const { id } = await params;
  const personaId = Number(id);
  if (!Number.isFinite(personaId)) notFound();

  const filas = await q<any>('select * from multas.saldos where id=$1', [personaId]);
  if (!filas.length) notFound();
  const p = filas[0];

  const movimientos = await q<any>(
    `select 'multa' as tipo, se.numero::text as ref, to_char(se.fecha_cierre,'DD Mon') as fecha,
            m.monto, m.estado, (m.dias_cumplidos || ' de ' || m.meta || ' días') as detalle
     from multas.multas m join multas.semanas se on se.id = m.semana_id
     where m.persona_id = $1
     union all
     select case when a.tipo='saldo_inicial' then 'saldo_inicial' else 'abono' end,
            a.registrado_por, to_char(a.fecha,'DD Mon'),
            case when a.tipo='saldo_inicial' then a.monto else -a.monto end,
            a.estado, coalesce(a.nota,'')
     from multas.abonos a where a.persona_id = $1
     order by fecha desc, ref desc`,
    [personaId],
  );

  const debe = p.saldo > 0;
  const aFavor = p.saldo < 0;

  return (
    <>
      <div className="titular">
        <div>
          <Link href="/" className="volver"><ChevronLeft size={18} aria-hidden />Resumen</Link>
          <h1>{p.nombre}</h1>
        </div>
      </div>

      <div className="tarjeta">
        <div className="cab">
          <Flame size={17} color={aFavor ? 'var(--verde)' : 'var(--rojo)'}
            fill={aFavor ? 'var(--verde)' : 'var(--rojo)'} aria-hidden />
          <span className="cab__t" style={{ color: aFavor ? 'var(--verde)' : 'var(--rojo)' }}>
            {aFavor ? 'A favor' : debe ? 'Debe' : 'Al día'}
          </span>
        </div>
        <p className={'cifra' + (aFavor ? ' cifra--verde' : '')}>
          <b>{formatoCOP(Math.abs(p.saldo))}</b>
        </p>
        <p className="pie">{movimientos.length} movimientos</p>
      </div>

      {debe ? (
        <Link href={`/abonos?persona=${p.id}`} className="boton">Registrar abono</Link>
      ) : null}

      <div className="tarjeta">
        <div className="cab">
          <PieChart size={17} color="var(--teal)" aria-hidden />
          <span className="cab__t" style={{ color: 'var(--teal)' }}>Desglose</span>
        </div>
        <div className="trio">
          <div className="trio__c">
            <div className="trio__l">Inicial</div>
            <div className="trio__v"><b>{miles(p.saldo_inicial)}</b><span>mil</span></div>
          </div>
          <div className="trio__c">
            <div className="trio__l">Multas</div>
            <div className="trio__v"><b>{miles(p.total_multas)}</b><span>mil</span></div>
          </div>
          <div className="trio__c">
            <div className="trio__l">Abonos</div>
            <div className="trio__v"><b>{miles(p.total_abonos)}</b><span>mil</span></div>
          </div>
        </div>
      </div>

      <div className="grupo">
        <div className="grupo__h"><h2>Movimientos</h2></div>
        <div className="tarjeta tarjeta--lista">
          {movimientos.map((m: any, k: number) => {
            const anulado = m.estado === 'anulada' || m.estado === 'anulado';
            return (
              <div key={k} className={'fila' + (anulado ? ' fila--anulada' : '')}>
                <span className="fila__n">
                  <span className="fila__nm">
                    {m.tipo === 'multa' ? `Semana ${m.ref}` : null}
                    {m.tipo === 'abono' ? 'Abono' : null}
                    {m.tipo === 'saldo_inicial' ? 'Saldo inicial' : null}
                    {m.estado === 'exenta' ? <span className="insignia insignia--naranja">Excusa</span> : null}
                    {anulado ? <span className="insignia insignia--roja">Anulado</span> : null}
                  </span>
                  <span className="fila__s">
                    {m.fecha}
                    {m.tipo === 'multa' ? ` · ${m.detalle}` : ''}
                    {m.tipo === 'abono' ? `${m.detalle ? ` · ${m.detalle}` : ''} · registró ${m.ref}` : ''}
                    {m.tipo === 'saldo_inicial' ? ' · migrado de Splitwise' : ''}
                  </span>
                </span>
                <span className={'fila__a' + (m.monto < 0 ? ' fila__a--verde' : '')}>
                  {formatoCOP(m.monto)}
                </span>
              </div>
            );
          })}
          {movimientos.length === 0 ? <p className="vacio">Sin movimientos.</p> : null}
        </div>
      </div>
    </>
  );
}
