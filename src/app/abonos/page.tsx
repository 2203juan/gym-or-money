import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { saldos } from '@/lib/dominio';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';
import FormAbono from './form';

export const dynamic = 'force-dynamic';

export default async function Abonos() {
  if (!(await usuarioActual())) redirect('/login');
  const lista = await saldos();
  const ultimos = await q<any>(`
    select a.id, p.nombre, a.monto, a.fecha::text, a.nota, a.registrado_por, a.estado
    from multas.abonos a join multas.personas p on p.id = a.persona_id
    where a.tipo = 'abono' order by a.creado_en desc limit 25`);

  return (
    <>
      <h1>Abonos</h1>
      <p className="sub">Registra un pago. Se descuenta del saldo de inmediato.</p>
      <FormAbono personas={lista.map((p) => ({ id: p.id, nombre: p.nombre, saldo: p.saldo }))} />

      <h2>Últimos abonos</h2>
      <div className="card scroll">
        <table>
          <thead><tr><th>Fecha</th><th>Persona</th><th className="r">Monto</th></tr></thead>
          <tbody>
            {ultimos.map((a: any) => (
              <tr key={a.id}>
                <td className="muted">{a.fecha}</td>
                <td>{a.nombre}<div className="muted">{a.nota ?? ''} · registró {a.registrado_por}</div></td>
                <td className="r amount zero">{formatoCOP(a.monto)}</td>
              </tr>
            ))}
            {ultimos.length === 0 ? <tr><td colSpan={3} className="muted">Sin abonos todavía.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
