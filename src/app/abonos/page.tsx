import Link from 'next/link';
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
  const recaudado = await q<{ t: number }>(
    "select coalesce(sum(monto),0)::int as t from multas.abonos where tipo='abono' and estado='activo'",
  );
  const ultimos = await q<any>(
    `select a.id, p.nombre, a.monto, to_char(a.fecha,'DD Mon YYYY') as fecha,
            a.nota, a.registrado_por
     from multas.abonos a join multas.personas p on p.id = a.persona_id
     where a.tipo = 'abono' and a.estado = 'activo'
     order by a.creado_en desc limit 25`,
  );

  return (
    <>
      <header className="barra">
        <Link href="/">← Saldos</Link>
        <span>Abonos</span>
      </header>

      <section className="total">
        <p className="total__etiqueta">Recaudado</p>
        <p className="total__cifra total__cifra--medio">{formatoCOP(recaudado[0]?.t ?? 0)}</p>
        <p className="total__pie"><span>Se descuenta del saldo al instante</span></p>
      </section>

      <FormAbono personas={lista.map((p) => ({ id: p.id, nombre: p.nombre, saldo: p.saldo }))} />

      <div className="seccion"><h2 className="seccion__t">Últimos abonos</h2></div>
      {ultimos.map((a: any) => (
        <div className="movimiento" key={a.id}>
          <span>
            <span className="movimiento__t">{a.nombre}</span>
            <span className="movimiento__d">
              {a.fecha}{a.nota ? ` · ${a.nota}` : ''} · registró {a.registrado_por}
            </span>
          </span>
          <span className="movimiento__a movimiento__a--negativo">{formatoCOP(a.monto)}</span>
        </div>
      ))}
      {ultimos.length === 0 ? <p className="vacio">Sin abonos todavía.</p> : null}
    </>
  );
}
