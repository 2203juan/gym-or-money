'use client';
import { useActionState, useState } from 'react';
import { previsualizar, confirmarSemana } from '../acciones';
import { formatoCOP } from '@/lib/multas';
import { discoDeMulta, TRAMOS } from '@/lib/discos';

const EJEMPLO = `Semana # 33

Naranjo: 4/4 ✅
Hoyos: 2/3
Betan: 0/3
Yummy: 4/6`;

export default function Procesar() {
  const [texto, setTexto] = useState('');
  const [prev, verDetalle, pendPrev] = useActionState(previsualizar, null as any);
  const [conf, confirmar, pendConf] = useActionState(confirmarSemana, null);

  const a = prev?.analisis;
  const bloqueado = a?.items?.some((i: any) => i.error && i.personaId !== null);
  const puedeRegistrar = a?.esResumen && !a.yaProcesada && a.semana !== null && !bloqueado;

  return (
    <>
      <form action={verDetalle} className="forma">
        <div className="campo">
          <label className="campo__l" htmlFor="texto">Mensaje del grupo</label>
          <textarea
            id="texto" name="texto" value={texto} placeholder={EJEMPLO}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <button className="boton boton--fantasma" disabled={pendPrev}>
          {pendPrev ? 'Analizando' : 'Ver detalle'}
        </button>
        <p className="tenue">Nada se guarda hasta que confirmes.</p>
      </form>

      {prev && !a?.esResumen ? (
        <div className="aviso aviso--ojo">
          El mensaje no tiene ninguna línea con el formato <strong>Nombre: hechos/meta</strong>.
          No se registra nada.
        </div>
      ) : null}

      {a?.esResumen ? (
        <section className="total" style={{ borderTop: '3px solid var(--ink)', marginTop: 18 }}>
          <div className="seccion" style={{ padding: 0 }}>
            <h2 className="seccion__t">Semana {a.semana ?? 'sin número'}</h2>
            <span className="seccion__n">{formatoCOP(a.totalCobrado)}</span>
          </div>
        </section>
      ) : null}

      {a?.esResumen ? (
        <>
          {a.yaProcesada ? (
            <div className="aviso aviso--ojo" style={{ marginTop: 14 }}>
              La semana {a.semana} ya estaba registrada. No se crearán multas duplicadas.
            </div>
          ) : null}
          {a.semana === null ? (
            <div className="aviso aviso--malo" style={{ marginTop: 14 }}>
              El mensaje no trae número de semana. Agrégalo (por ejemplo «Semana # 33»).
            </div>
          ) : null}

          <div style={{ marginTop: 10 }}>
            {a.items.map((i: any, k: number) => (
              <div className="calculo" key={k}>
                <span className="calculo__canto" data-disco={discoDeMulta(i.monto, i.estado)} />
                <span className="calculo__nombre">
                  {i.nombre}
                  {i.personaId === null ? <span className="etiqueta etiqueta--anulado">Sin mapear</span> : null}
                  {i.estado === 'exenta' ? <span className="etiqueta etiqueta--excusa">Excusa</span> : null}
                  {i.error && i.personaId !== null ? (
                    <span className="movimiento__d" style={{ color: 'var(--accent)' }}>{i.error}</span>
                  ) : null}
                </span>
                <span className="calculo__marcador">{i.dias}/{i.meta}</span>
                <span className={'calculo__monto' + (i.monto > 0 ? '' : ' calculo__monto--cero')}>
                  {i.error ? '—' : formatoCOP(i.monto)}
                </span>
              </div>
            ))}
          </div>

          <div className="leyenda">
            {TRAMOS.map((t) => (
              <span key={t.disco}>
                <i style={{ background: `var(--${t.disco})` }} />{t.texto}
              </span>
            ))}
            <span><i style={{ background: 'var(--line)' }} />Sin multa</span>
          </div>

          {a.desconocidos.length ? (
            <div className="aviso aviso--ojo" style={{ marginTop: 14 }}>
              Nombres sin reconocer: <strong>{a.desconocidos.join(', ')}</strong>. No se registran sus
              multas. Agrégalos como alias en ajustes, o marca la casilla para registrar el resto.
            </div>
          ) : null}
          {bloqueado ? (
            <div className="aviso aviso--malo" style={{ marginTop: 14 }}>
              Hay líneas con errores que impiden registrar la semana. Corrige el mensaje y vuelve a
              analizar.
            </div>
          ) : null}

          {puedeRegistrar ? (
            <form action={confirmar} className="forma">
              <input type="hidden" name="texto" value={prev.texto} />
              {a.desconocidos.length ? (
                <label className="opcion">
                  <input type="checkbox" name="ignorarDesconocidos" id="ignorarDesconocidos" />
                  <span>Registrar igual y dejar los nombres sin reconocer como pendientes</span>
                </label>
              ) : null}
              <button className="boton" disabled={pendConf}>
                {pendConf ? 'Registrando' : 'Registrar y avisar'}
              </button>
            </form>
          ) : null}

          {conf?.error ? <div className="aviso aviso--malo" style={{ marginBottom: 16 }}>{conf.error}</div> : null}
        </>
      ) : null}
    </>
  );
}
