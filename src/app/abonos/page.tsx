import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { usuarioActual } from '@/lib/auth';
import { saldos } from '@/lib/dominio';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';
import FormAbono from './form';

export const dynamic = 'force-dynamic';

export default async function Abonos({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  if (!(await usuarioActual())) redirect('/login');
  const { persona } = await searchParams;

  const lista = await saldos();
  const recaudado = await q<{ t: number }>(
    "select coalesce(sum(monto),0)::int as t from multas.abonos where tipo='abono' and estado='activo'",
  );
  const ultimos = await q<any>(
    `select a.id, p.nombre, a.monto, to_char(a.fecha,'DD Mon') as fecha, a.nota, a.registrado_por
     from multas.abonos a join multas.personas p on p.id = a.persona_id
     where a.tipo = 'abono' and a.estado = 'activo'
     order by a.creado_en desc limit 25`,
  );

  return (
    <>
      <div className="titular">
        <div>
          <h1>Abonos</h1>
          <p className="titular__v">Se descuenta del saldo al instante</p>
        </div>
      </div>

      <div className="tarjeta">
        <div className="cab">
          <Wallet size={17} color="var(--verde)" aria-hidden />
          <span className="cab__t" style={{ color: 'var(--verde)' }}>Recaudado</span>
          <span className="cab__d">{ultimos.length} abonos</span>
        </div>
        <p className="cifra cifra--verde"><b>{formatoCOP(recaudado[0]?.t ?? 0)}</b></p>
      </div>

      <FormAbono
        personas={lista.map((p) => ({ id: p.id, nombre: p.nombre, saldo: p.saldo }))}
        inicial={persona ? Number(persona) : undefined}
      />

      <div className="grupo">
        <div className="grupo__h"><h2>Últimos abonos</h2></div>
        <div className="tarjeta tarjeta--lista">
          {ultimos.map((a: any) => (
            <div className="fila" key={a.id}>
              <span className="fila__n">
                <span className="fila__nm">{a.nombre}</span>
                <span className="fila__s">
                  {a.fecha}{a.nota ? ` · ${a.nota}` : ''} · registró {a.registrado_por}
                </span>
              </span>
              <span className="fila__a fila__a--verde">−{formatoCOP(a.monto)}</span>
            </div>
          ))}
          {ultimos.length === 0 ? <p className="vacio">Sin abonos todavía.</p> : null}
        </div>
      </div>
    </>
  );
}
