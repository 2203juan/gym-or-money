import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { saldos } from '@/lib/dominio';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';
import { salir } from './acciones';

export const dynamic = 'force-dynamic';

export default async function Tablero() {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/login');

  const lista = await saldos();
  const bote = lista.reduce((s, p) => s + p.saldo, 0); // neto, igual que el total de Splitwise
  const max = Math.max(1, ...lista.map((p) => Math.max(p.saldo, 0)));
  const pend = await q<{ n: number }>(
    'select count(*)::int as n from multas.pendientes_mapeo where resuelto = false');
  const receptor = await q<{ nombre: string }>(
    'select nombre from multas.personas where es_receptor = true limit 1');

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="grow">
          <h1>Ejercicio o Money</h1>
          <p className="sub" style={{ margin: 0 }}>Hola, {usuario}.</p>
        </div>
        <form action={salir}><button className="ghost small">Salir</button></form>
      </div>

      <div className="bote">
        <div className="l">El bote</div>
        <div className="n">{formatoCOP(bote)}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Total que el grupo le debe a {receptor[0]?.nombre ?? 'el bote'}
        </div>
      </div>

      {pend[0]?.n ? (
        <div className="alert warn">
          Hay {pend[0].n} nombre(s) sin mapear. <Link href="/config">Resolver en Ajustes →</Link>
        </div>
      ) : null}

      <h2>Saldos</h2>
      {lista.map((p) => (
        <div key={p.id} className="card">
          <Link href={`/persona/${p.id}`}>
            <div className="row">
              <div className="grow">
                <div className="name" style={{ color: 'var(--tx)' }}>{p.nombre}</div>
                <div className="muted">
                  {p.saldo_inicial !== 0 ? <>inicial {formatoCOP(p.saldo_inicial)} · </> : null}
                  multas {formatoCOP(p.total_multas)} · abonos {formatoCOP(p.total_abonos)}
                </div>
              </div>
              <div className={'amount ' + (p.saldo > 0 ? 'pos' : 'zero')}>
                {formatoCOP(p.saldo)}
                {p.saldo < 0 ? <div className="muted" style={{ fontWeight: 400 }}>a favor</div> : null}
              </div>
            </div>
          </Link>
          <div className="bar"><i style={{ width: `${(Math.max(p.saldo, 0) / max) * 100}%` }} /></div>
        </div>
      ))}

      <p className="muted" style={{ marginTop: 20 }}>
        <Link href="/config">Ajustes: saldos iniciales y alias →</Link>
      </p>
    </>
  );
}
