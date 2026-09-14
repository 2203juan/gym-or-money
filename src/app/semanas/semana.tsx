'use client';
import { useActionState, useState } from 'react';
import { anular, editar } from '../acciones';
import { formatoCOP } from '@/lib/multas';
import { discoDeMulta } from '@/lib/discos';

export default function Semana({ s }: { s: any }) {
  const [abierta, setAbierta] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  const [estAnular, accAnular, pendAnular] = useActionState(anular, null);
  const [estEdit, accEdit, pendEdit] = useActionState(editar, null);
  const anulada = s.estado === 'anulada';
  const enEdicion = s.detalle.find((m: any) => m.id === edit);

  return (
    <div style={anulada ? { opacity: 0.55 } : undefined}>
      <button
        type="button"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        className="fila"
        style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
      >
        <span>
          <span className="fila__nombre">
            Semana {s.numero}
            {anulada ? <span className="etiqueta etiqueta--anulado">Anulada</span> : null}
          </span>
          <span className="fila__sub">{s.fecha_cierre} · procesó {s.procesada_por}</span>
        </span>
        <span className="fila__monto">{s.totalFmt} {abierta ? '▾' : '▸'}</span>
      </button>

      {abierta ? (
        <>
          {anulada ? (
            <div className="aviso aviso--ojo" style={{ marginTop: 12 }}>
              Anulada por {s.anulada_por}. Motivo: {s.motivo_anulacion}. Puedes volver a procesarla.
            </div>
          ) : null}

          <div style={{ marginTop: 8 }}>
            {s.detalle.map((m: any) => (
              <div className="calculo" key={m.id} style={{ gridTemplateColumns: '4px 1fr 52px auto auto' }}>
                <span className="calculo__canto" data-disco={discoDeMulta(m.monto, m.estado)} />
                <span className="calculo__nombre">
                  {m.nombre}
                  {m.estado === 'exenta' ? <span className="etiqueta etiqueta--excusa">Excusa</span> : null}
                  {m.estado === 'anulada' ? <span className="etiqueta etiqueta--anulado">Anulada</span> : null}
                </span>
                <span className="calculo__marcador">{m.dias}/{m.meta}</span>
                <span className={'calculo__monto' + (m.monto > 0 ? '' : ' calculo__monto--cero')}>
                  {formatoCOP(m.monto)}
                </span>
                <span>
                  {!anulada ? (
                    <button
                      type="button"
                      className="boton boton--fantasma boton--chico"
                      onClick={() => setEdit(edit === m.id ? null : m.id)}
                    >
                      Editar
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>

          {enEdicion ? (
            <form action={accEdit} className="forma forma--apretada">
              <input type="hidden" name="multaId" value={enEdicion.id} />
              <div className="duo">
                <div className="campo">
                  <label className="campo__l" htmlFor={`dias-${enEdicion.id}`}>Días cumplidos</label>
                  <input id={`dias-${enEdicion.id}`} name="dias" type="number" min={0} max={14} defaultValue={enEdicion.dias} />
                </div>
                <div className="campo">
                  <label className="campo__l" htmlFor={`estado-${enEdicion.id}`}>Estado</label>
                  <select id={`estado-${enEdicion.id}`} name="estado" defaultValue={enEdicion.estado}>
                    <option value="cobrada">Cobrada</option>
                    <option value="exenta">Exenta por excusa</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>
              </div>
              <div className="campo">
                <label className="campo__l" htmlFor={`motivo-${enEdicion.id}`}>Motivo</label>
                <input id={`motivo-${enEdicion.id}`} name="motivo" placeholder="Por qué se corrige" />
              </div>
              {estEdit?.error ? <div className="aviso aviso--malo">{estEdit.error}</div> : null}
              {estEdit?.ok ? <div className="aviso aviso--ok">{estEdit.ok}</div> : null}
              <button className="boton" disabled={pendEdit}>{pendEdit ? 'Guardando' : 'Guardar corrección'}</button>
            </form>
          ) : null}

          {!anulada ? (
            <form action={accAnular} className="forma forma--apretada">
              <input type="hidden" name="numero" value={s.numero} />
              <div className="campo">
                <label className="campo__l" htmlFor={`anular-${s.numero}`}>
                  Anular la semana completa · revierte todas sus multas
                </label>
                <input id={`anular-${s.numero}`} name="motivo" placeholder="Motivo de la anulación" />
              </div>
              {estAnular?.error ? <div className="aviso aviso--malo">{estAnular.error}</div> : null}
              {estAnular?.ok ? <div className="aviso aviso--ok">{estAnular.ok}</div> : null}
              <button className="boton boton--peligro" disabled={pendAnular}>
                {pendAnular ? 'Anulando' : `Anular semana ${s.numero}`}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
