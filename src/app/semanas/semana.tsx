'use client';
import { useActionState, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { anular, editar } from '../acciones';
import { formatoCOP } from '@/lib/multas';
import Anillo from '../anillo';

export default function Semana({ s }: { s: any }) {
  const [abierta, setAbierta] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  const [estAnular, accAnular, pendAnular] = useActionState(anular, null);
  const [estEdit, accEdit, pendEdit] = useActionState(editar, null);
  const anulada = s.estado === 'anulada';
  const enEdicion = s.detalle.find((m: any) => m.id === edit);

  return (
    <div className="tarjeta tarjeta--lista" style={anulada ? { opacity: 0.6 } : undefined}>
      <button type="button" className="fila" aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)} style={{ cursor: 'pointer' }}>
        <span className="fila__n">
          <span className="fila__nm">
            Semana {s.numero}
            {anulada ? <span className="insignia insignia--roja">Anulada</span> : null}
          </span>
          <span className="fila__s">{s.fecha_cierre} · procesó {s.procesada_por}</span>
        </span>
        <span className="fila__a">{s.totalFmt}</span>
        {abierta
          ? <ChevronDown size={14} className="fila__ch" aria-hidden />
          : <ChevronRight size={14} className="fila__ch" aria-hidden />}
      </button>

      {abierta ? (
        <>
          {anulada ? (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--sep-soft)' }}>
              <p className="tenue" style={{ margin: 0 }}>
                Anulada por {s.anulada_por}. Motivo: {s.motivo_anulacion}. Puedes volver a procesarla.
              </p>
            </div>
          ) : null}

          {s.detalle.map((m: any) => (
            <div className="fila" key={m.id}>
              <Anillo dias={m.dias} meta={m.meta} />
              <span className="fila__n">
                <span className="fila__nm">
                  {m.nombre}
                  {m.estado === 'exenta' ? <span className="insignia insignia--naranja">Excusa</span> : null}
                  {m.estado === 'anulada' ? <span className="insignia insignia--roja">Anulada</span> : null}
                </span>
                <span className="fila__s">{m.dias} de {m.meta} días</span>
              </span>
              <span className={'fila__a' + (m.monto > 0 ? '' : ' fila__a--gris')}>{formatoCOP(m.monto)}</span>
              {!anulada ? (
                <button type="button" className="boton boton--sec boton--chico"
                  onClick={() => setEdit(edit === m.id ? null : m.id)}>Editar</button>
              ) : null}
            </div>
          ))}

          {enEdicion ? (
            <form action={accEdit} className="forma" style={{ padding: 16, borderTop: '1px solid var(--sep-soft)' }}>
              <input type="hidden" name="multaId" value={enEdicion.id} />
              <div className="duo">
                <div className="campo">
                  <label className="campo__l" htmlFor={`dias-${enEdicion.id}`}>Días cumplidos</label>
                  <input id={`dias-${enEdicion.id}`} name="dias" type="number" min={0} max={14}
                    defaultValue={enEdicion.dias} style={{ background: 'var(--card-2)' }} />
                </div>
                <div className="campo">
                  <label className="campo__l" htmlFor={`estado-${enEdicion.id}`}>Estado</label>
                  <select id={`estado-${enEdicion.id}`} name="estado" defaultValue={enEdicion.estado}
                    style={{ background: 'var(--card-2)' }}>
                    <option value="cobrada">Cobrada</option>
                    <option value="exenta">Exenta por excusa</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>
              </div>
              <div className="campo">
                <label className="campo__l" htmlFor={`motivo-${enEdicion.id}`}>Motivo</label>
                <input id={`motivo-${enEdicion.id}`} name="motivo" placeholder="Por qué se corrige"
                  style={{ background: 'var(--card-2)' }} />
              </div>
              {estEdit?.error ? <div className="aviso aviso--malo">{estEdit.error}</div> : null}
              {estEdit?.ok ? <div className="aviso aviso--ok">{estEdit.ok}</div> : null}
              <button className="boton" disabled={pendEdit}>{pendEdit ? 'Guardando…' : 'Guardar corrección'}</button>
            </form>
          ) : null}

          {!anulada ? (
            <form action={accAnular} className="forma" style={{ padding: 16, borderTop: '1px solid var(--sep-soft)' }}>
              <input type="hidden" name="numero" value={s.numero} />
              <div className="campo">
                <label className="campo__l" htmlFor={`anular-${s.numero}`}>
                  Anular la semana completa · revierte todas sus multas
                </label>
                <input id={`anular-${s.numero}`} name="motivo" placeholder="Motivo de la anulación"
                  style={{ background: 'var(--card-2)' }} />
              </div>
              {estAnular?.error ? <div className="aviso aviso--malo">{estAnular.error}</div> : null}
              {estAnular?.ok ? <div className="aviso aviso--ok">{estAnular.ok}</div> : null}
              <button className="boton boton--texto" disabled={pendAnular}>
                {pendAnular ? 'Anulando…' : `Anular semana ${s.numero}`}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
