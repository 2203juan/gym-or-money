import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Flame, Activity, ChevronRight } from 'lucide-react';
import { usuarioActual } from '@/lib/auth';
import { saldos } from '@/lib/dominio';
import { q } from '@/lib/db';
import { formatoCOP } from '@/lib/multas';
import { barajarConSemilla } from '@/lib/orden';
import Anillo from './anillo';
import { salir } from './acciones';

export const dynamic = 'force-dynamic';

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}

export default async function Resumen() {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/login');

  const lista = await saldos();
  const acumulado = lista.reduce((s, p) => s + p.saldo, 0);
  const deben = lista.filter((p) => p.saldo > 0).length;
  const aFavor = lista.filter((p) => p.saldo < 0).length;

  const [ultima] = await q<{ numero: number; fecha: string }>(
    `select numero, to_char(fecha_cierre,'DD Mon') as fecha
     from multas.semanas where estado='procesada' order by numero desc limit 1`,
  );
  const semana = ultima?.numero ?? 0;

  const marcadores = await q<{ persona_id: number; dias: number; meta: number; estado: string; monto: number }>(
    `select m.persona_id, m.dias_cumplidos as dias, m.meta, m.estado, m.monto
     from multas.multas m join multas.semanas s on s.id = m.semana_id
     where s.numero = $1 and s.estado = 'procesada'`,
    [semana],
  );
  const porPersona = new Map(marcadores.map((m) => [Number(m.persona_id), m]));
  const cumplieron = marcadores.filter((m) => m.dias >= m.meta).length;
  const multados = marcadores.filter((m) => m.estado === 'cobrada' && m.monto > 0).length;
  const multadoTotal = marcadores.reduce((s, m) => s + (m.estado === 'cobrada' ? m.monto : 0), 0);

  const pendientes = await q<{ n: number }>(
    'select count(*)::int as n from multas.pendientes_mapeo where resuelto = false',
  );

  const orden = barajarConSemilla(lista, semana || 1);

  return (
    <>
      <div className="titular">
        <div>
          <h1>Resumen</h1>
          <p className="titular__v">
            {semana ? `Semana ${semana} · ${ultima.fecha}` : 'Sin semanas registradas'}
          </p>
        </div>
        <form action={salir}>
          <button className="avatar" type="submit" title={`Salir · ${usuario}`} aria-label={`Salir, ${usuario}`}>
            {iniciales(usuario)}
          </button>
        </form>
      </div>

      <div className="tarjeta">
        <div className="cab">
          <Flame size={17} color="var(--rojo)" fill="var(--rojo)" aria-hidden />
          <span className="cab__t" style={{ color: 'var(--rojo)' }}>Acumulado</span>
          <Link href="/abonos" className="cab__d">
            {lista.length} personas <ChevronRight size={12} aria-hidden />
          </Link>
        </div>
        <p className="cifra"><b>{formatoCOP(acumulado)}</b></p>
        <p className="pie">
          {deben} {deben === 1 ? 'debe' : 'deben'}
          {aFavor ? ` · ${aFavor} con saldo a favor` : ''}
        </p>
      </div>

      {semana ? (
        <div className="tarjeta">
          <div className="cab">
            <Activity size={17} color="var(--naranja)" aria-hidden />
            <span className="cab__t" style={{ color: 'var(--naranja)' }}>Esta semana</span>
            <Link href="/semanas" className="cab__d">
              Semana {semana} <ChevronRight size={12} aria-hidden />
            </Link>
          </div>
          <div className="semana">
            <div className="trio">
              <div className="trio__c">
                <div className="trio__l" style={{ color: 'var(--verde)' }}>Cumplieron</div>
                <div className="trio__v"><b>{cumplieron}</b><span>de {marcadores.length}</span></div>
              </div>
              <div className="trio__c">
                <div className="trio__l" style={{ color: 'var(--rojo)' }}>Multados</div>
                <div className="trio__v"><b>{multados}</b><span>pers.</span></div>
              </div>
              <div className="trio__c">
                <div className="trio__l" style={{ color: 'var(--naranja)' }}>Multado</div>
                <div className="trio__v">
                  <b>{Math.round(multadoTotal / 1000)}</b><span>mil</span>
                </div>
              </div>
            </div>
            <Anillo dias={cumplieron} meta={marcadores.length || 1} tam={52} conTexto />
          </div>
        </div>
      ) : null}

      {pendientes[0]?.n ? (
        <div className="aviso aviso--ojo">
          Hay {pendientes[0].n} nombre(s) sin mapear. <Link href="/config">Resolver en ajustes</Link>
        </div>
      ) : null}

      <div className="grupo">
        <div className="grupo__h">
          <h2>Saldos</h2>
          <Link href="/config" className="enlace">Ajustes</Link>
        </div>
        <div className="tarjeta tarjeta--lista">
          {orden.map((p) => {
            const m = porPersona.get(Number(p.id));
            const yo = p.nombre === usuario;
            const sub =
              p.saldo < 0 ? 'Saldo a favor'
              : m && m.estado === 'exenta' ? `${m.dias} de ${m.meta} días · exento`
              : m && m.dias >= m.meta ? 'Meta cumplida'
              : m ? `${m.dias} de ${m.meta} días`
              : 'Sin registro esta semana';
            return (
              <Link key={p.id} href={`/persona/${p.id}`} className={'fila' + (yo ? ' fila--yo' : '')}>
                <Anillo dias={m?.dias ?? 0} meta={m?.meta ?? 0} />
                <span className="fila__n">
                  <span className="fila__nm">{p.nombre}{yo ? <span className="yo">TÚ</span> : null}</span>
                  <span className="fila__s">{sub}</span>
                </span>
                <span className={'fila__a' + (p.saldo < 0 ? ' fila__a--verde' : p.saldo === 0 ? ' fila__a--gris' : '')}>
                  {formatoCOP(p.saldo)}
                </span>
                <ChevronRight size={12} className="fila__ch" aria-hidden />
              </Link>
            );
          })}
          {orden.length === 0 ? <p className="vacio">Todavía no hay personas cargadas.</p> : null}
        </div>
      </div>

      <p className="tenue centro" style={{ padding: '0 16px' }}>
        El orden se baraja al cerrar cada semana, igual para todos.
      </p>
    </>
  );
}
