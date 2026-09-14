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

  const s = await q<any>('select * from multas.saldos where id=$1', [personaId]);
  if (!s.length) notFound();
  const p = s[0];

  const movimientos = await q<any>(`
    select 'multa' as tipo, se.numero::text as ref, se.fecha_cierre::text as fecha,
           m.monto, m.estado, (m.dias_cumplidos || '/' || m.meta) as detalle, m.motivo
    from multas.multas m join multas.semanas se on se.id = m.semana_id
    where m.persona_id = $1
    union all
    select case when a.tipo='saldo_inicial' then 'saldo_inicial' else 'abono' end,
           a.registrado_por, a.fecha::text,
           case when a.tipo='saldo_inicial' then a.monto else -a.monto end,
           a.estado, coalesce(a.nota,''), null
    from multas.abonos a where a.persona_id = $1
    order by fecha desc, ref desc
  `, [personaId]);

  return (
    <>
      <p className="muted"><Link href="/">← Saldos</Link></p>
      <h1>{p.nombre}</h1>
      <div className="bote">
        <div className="l">Saldo actual</div>
        <div className="n">{formatoCOP(p.saldo)}</div>
        <div className="muted" style={{ marginTop: 6 }}>
          inicial {formatoCOP(p.saldo_inicial)} + multas {formatoCOP(p.total_multas)} − abonos {formatoCOP(p.total_abonos)}
        </div>
      </div>

      <h2>Movimientos</h2>
      <div className="card scroll">
        <table>
          <thead><tr><th>Fecha</th><th>Concepto</th><th className="r">Monto</th></tr></thead>
          <tbody>
            {movimientos.map((m: any, k: number) => (
              <tr key={k} style={m.estado === 'anulada' || m.estado === 'anulado' ? { opacity: .45 } : undefined}>
                <td className="muted">{m.fecha}</td>
                <td>
                  {m.tipo === 'multa' ? `Semana ${m.ref} · ${m.detalle}` : null}
                  {m.tipo === 'abono' ? `Abono${m.detalle ? ' · ' + m.detalle : ''}` : null}
                  {m.tipo === 'saldo_inicial' ? 'Saldo inicial migrado de Splitwise' : null}
                  {m.estado === 'exenta' ? <> <span className="pill warn">exento</span></> : null}
                  {m.estado === 'anulada' || m.estado === 'anulado' ? <> <span className="pill bad">anulado</span></> : null}
                </td>
                <td className={'r amount ' + (m.monto > 0 ? 'pos' : 'zero')}>{formatoCOP(m.monto)}</td>
              </tr>
            ))}
            {movimientos.length === 0 ? <tr><td colSpan={3} className="muted">Sin movimientos.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
