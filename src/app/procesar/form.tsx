'use client';
import { useActionState, useState } from 'react';
import { previsualizar, confirmarSemana } from '../acciones';
import { formatoCOP } from '@/lib/multas';
import Anillo from '../anillo';

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
        <label className="campo__l" htmlFor="texto" style={{ display: 'none' }}>Mensaje del grupo</label>
        <textarea
          id="texto" name="texto" value={texto} placeholder={EJEMPLO}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="boton boton--sec" disabled={pendPrev}>
          {pendPrev ? 'Analizando…' : 'Ver detalle'}
        </button>
      </form>

      {prev && !a?.esResumen ? (
        <div className="aviso aviso--ojo">
          El mensaje no tiene ninguna línea con el formato <strong>Nombre: hechos/meta</strong>.
          No se registra nada.
        </div>
      ) : null}

      {a?.esResumen ? (
        <>
          <div className="grupo">
            <div className="grupo__h">
              <h2>Semana {a.semana ?? 'sin número'}</h2>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--rojo)' }} className="cifra-tab">
                {formatoCOP(a.totalCobrado)}
              </span>
            </div>
            <div className="tarjeta tarjeta--lista">
              {a.items.map((i: any, k: number) => (
                <div className="fila" key={k}>
                  <Anillo dias={i.dias} meta={i.meta} />
                  <span className="fila__n">
                    <span className="fila__nm">
                      {i.nombre}
                      {i.personaId === null ? <span className="insignia insignia--roja">Sin mapear</span> : null}
                      {i.estado === 'exenta' ? <span className="insignia insignia--naranja">Excusa</span> : null}
                    </span>
                    <span className="fila__s">
                      {i.error && i.personaId !== null ? i.error : `${i.dias} de ${i.meta} días`}
                    </span>
                  </span>
                  <span className={'fila__a' + (i.monto > 0 ? ' fila__a--rojo' : ' fila__a--gris')}>
                    {i.error ? '—' : formatoCOP(i.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {a.yaProcesada ? (
            <div className="aviso aviso--ojo">
              La semana {a.semana} ya estaba registrada. No se crearán multas duplicadas.
            </div>
          ) : null}
          {a.semana === null ? (
            <div className="aviso aviso--malo">
              El mensaje no trae número de semana. Agrégalo, por ejemplo «Semana # 33».
            </div>
          ) : null}
          {a.desconocidos.length ? (
            <div className="aviso aviso--ojo">
              Nombres sin reconocer: <strong>{a.desconocidos.join(', ')}</strong>. No se registran
              sus multas. Agrégalos como alias en ajustes, o marca la casilla para registrar el resto.
            </div>
          ) : null}
          {bloqueado ? (
            <div className="aviso aviso--malo">
              Hay líneas con errores que impiden registrar la semana. Corrige el mensaje y vuelve a
              analizar.
            </div>
          ) : null}
          {conf?.error ? <div className="aviso aviso--malo">{conf.error}</div> : null}

          {puedeRegistrar ? (
            <form action={confirmar} className="forma">
              <input type="hidden" name="texto" value={prev.texto} />
              {a.desconocidos.length ? (
                <label className="opcion" htmlFor="ignorarDesconocidos">
                  <input type="checkbox" name="ignorarDesconocidos" id="ignorarDesconocidos" />
                  <span>Registrar igual y dejar los nombres sin reconocer como pendientes</span>
                </label>
              ) : null}
              <button className="boton" disabled={pendConf}>
                {pendConf ? 'Registrando…' : 'Registrar y avisar al grupo'}
              </button>
              <p className="tenue centro">Nada se guarda hasta que confirmes.</p>
            </form>
          ) : null}
        </>
      ) : null}
    </>
  );
}
