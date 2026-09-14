import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { saldos } from '@/lib/dominio';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';
import { barajarConSemilla } from '@/lib/orden';
import { salir } from './acciones';

export const dynamic = 'force-dynamic';

type UltimaMulta = { persona_id: number; dias: number; meta: number; estado: string };

export default async function Saldos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/login');

  const lista = await saldos();
  const acumulado = lista.reduce((s, p) => s + p.saldo, 0);

  const [ultima] = await q<{ numero: number; fecha: string }>(
    `select numero, to_char(fecha_cierre,'DD Mon YYYY') as fecha
     from multas.semanas where estado='procesada' order by numero desc limit 1`,
  );
  const semana = ultima?.numero ?? 0;

  // Marcador de cada quien en la ultima semana viva
  const marcadores = await q<UltimaMulta>(
    `select m.persona_id, m.dias_cumplidos as dias, m.meta, m.estado
     from multas.multas m join multas.semanas s on s.id = m.semana_id
     where s.numero = $1 and s.estado = 'procesada'`,
    [semana],
  );
  const porPersona = new Map(marcadores.map((m) => [Number(m.persona_id), m]));

  const pendientes = await q<{ n: number }>(
    'select count(*)::int as n from multas.pendientes_mapeo where resuelto = false',
  );

  // Orden barajado, estable durante toda la semana
  const orden = barajarConSemilla(lista, semana || 1);

  return (
    <>
      <header className="barra">
        <span>Ejercicio o Money</span>
        <form action={salir}>
          <button className="barra__salir" type="submit">Salir · {usuario}</button>
        </form>
      </header>

      <section className="total">
        <p className="total__etiqueta">Acumulado</p>
        <p className="total__cifra">{formatoCOP(acumulado)}</p>
        <p className="total__pie">
          <span className="marca">{lista.length} personas</span>
          <span>{semana ? `Semana ${semana} · ${ultima.fecha}` : 'Sin semanas registradas'}</span>
        </p>
      </section>

      {pendientes[0]?.n ? (
        <div className="aviso aviso--ojo" style={{ marginTop: 14 }}>
          Hay {pendientes[0].n} nombre(s) sin mapear. <Link href="/config">Resolver en ajustes</Link>
        </div>
      ) : null}

      <div className="filas">
        {orden.map((p) => {
          const m = porPersona.get(Number(p.id));
          const sub =
            p.saldo < 0 ? 'Saldo a favor'
            : m && m.estado === 'exenta' ? `${m.dias}/${m.meta} · exento por excusa`
            : m ? `${m.dias}/${m.meta} esta semana`
            : 'Sin registro esta semana';
          return (
            <Link key={p.id} href={`/persona/${p.id}`} className="fila">
              <span>
                <span className="fila__nombre">{p.nombre}</span>
                <span className="fila__sub">{sub}</span>
              </span>
              <span
                className={
                  'fila__monto' +
                  (p.saldo < 0 ? ' fila__monto--credito' : p.saldo === 0 ? ' fila__monto--cero' : '')
                }
              >
                {formatoCOP(p.saldo)}
              </span>
            </Link>
          );
        })}
        {orden.length === 0 ? <p className="vacio">Todavía no hay personas cargadas.</p> : null}
      </div>

      <p className="nota">
        El orden se baraja al cerrar cada semana, igual para todos. Toca un nombre para ver sus
        movimientos. <Link href="/config" style={{ textDecoration: 'underline' }}>Ajustes</Link>
      </p>
    </>
  );
}
