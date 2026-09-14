'use client';
import { useActionState, useState } from 'react';
import { previsualizar, confirmarSemana } from '../acciones';
import { formatoCOP } from '@/lib/multas';

const EJEMPLO = `Semana # 32

Naranjo: 4/4 ✅
Hoyos: 2/3
Betan: 0/3
Yummy: 4/6
Juanbol: 4/3 ✅
Juan Marcos: 1/2
Lucho: 3/3 ✅
Will: 3/3 ✅
Jorge: 3/3 ✅`;

export default function Procesar() {
  const [texto, setTexto] = useState('');
  const [prev, accionPrev, pendPrev] = useActionState(previsualizar, null as any);
  const [conf, accionConf, pendConf] = useActionState(confirmarSemana, null);

  const a = prev?.analisis;
  const hayBloqueo = a?.items?.some((i: any) => i.error && i.personaId !== null);

  return (
    <>
      <form action={accionPrev} className="card">
        <label htmlFor="texto">Mensaje de resumen</label>
        <textarea id="texto" name="texto" value={texto} placeholder={EJEMPLO}
          onChange={(e) => setTexto(e.target.value)} />
        <button className="ghost" disabled={pendPrev}>
          {pendPrev ? 'Analizando…' : 'Ver detalle'}
        </button>
      </form>

      {prev && !a?.esResumen ? (
        <div className="alert warn">
          El mensaje no tiene ninguna línea con el formato <code>Nombre: hechos/meta</code>. No se registra nada.
        </div>
      ) : null}

      {a?.esResumen ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row">
            <div className="grow"><strong>Semana {a.semana ?? '(sin número)'}</strong></div>
            <div className="amount">{formatoCOP(a.totalCobrado)}</div>
          </div>

          {a.yaProcesada ? (
            <div className="alert warn">La semana {a.semana} ya estaba registrada. No se crearán multas duplicadas.</div>
          ) : null}
          {a.semana === null ? (
            <div className="alert bad">El mensaje no trae número de semana. Agrégalo (ej. «Semana # 33»).</div>
          ) : null}

          <div className="scroll" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Persona</th><th>Marcador</th><th className="r">Multa</th></tr></thead>
              <tbody>
                {a.items.map((i: any, k: number) => (
                  <tr key={k}>
                    <td>
                      {i.nombre} {i.emoji}
                      {i.personaId === null ? <> <span className="pill bad">sin mapear</span></> : null}
                      {i.estado === 'exenta' ? <> <span className="pill warn">exento por excusa</span></> : null}
                      {i.error && i.personaId !== null ? (
                        <div className="muted" style={{ color: 'var(--bad)' }}>{i.error}</div>
                      ) : null}
                    </td>
                    <td className="muted">{i.dias}/{i.meta}</td>
                    <td className={'r amount ' + (i.monto > 0 ? 'pos' : 'zero')}>
                      {i.error ? '—' : formatoCOP(i.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {a.desconocidos.length ? (
            <div className="alert warn">
              Nombres sin reconocer: <strong>{a.desconocidos.join(', ')}</strong>.
              No se registran sus multas. Agrégalos como alias en Ajustes, o marca la casilla para
              registrar el resto de la semana y quedar el pendiente anotado.
            </div>
          ) : null}
          {hayBloqueo ? (
            <div className="alert bad">
              Hay líneas con errores que impiden registrar la semana. Corrige el mensaje y vuelve a analizar.
            </div>
          ) : null}

          {!a.yaProcesada && a.semana !== null && !hayBloqueo ? (
            <form action={accionConf} style={{ marginTop: 6 }}>
              <input type="hidden" name="texto" value={prev.texto} />
              {a.desconocidos.length ? (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" name="ignorarDesconocidos" style={{ width: 'auto' }} />
                  <span>Registrar igual y dejar los nombres sin reconocer como pendientes</span>
                </label>
              ) : null}
              <button disabled={pendConf}>
                {pendConf ? 'Registrando…' : `Registrar semana ${a.semana} y avisar en Telegram`}
              </button>
            </form>
          ) : null}

          {conf?.error ? <div className="alert bad">{conf.error}</div> : null}
        </div>
      ) : null}
    </>
  );
}
