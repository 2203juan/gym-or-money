'use client';
import { useActionState, useState } from 'react';
import { anular, editar } from '../acciones';
import { formatoCOP } from '@/lib/multas';

export default function Semana({ s }: { s: any }) {
  const [abierta, setAbierta] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  const [estAnular, accAnular, pendAnular] = useActionState(anular, null);
  const [estEdit, accEdit, pendEdit] = useActionState(editar, null);
  const anulada = s.estado === 'anulada';

  return (
    <div className="card" style={anulada ? { opacity: 0.6 } : undefined}>
      <div className="row" onClick={() => setAbierta(!abierta)} style={{ cursor: 'pointer' }}>
        <div className="grow">
          <div className="name">
            Semana {s.numero} {anulada ? <span className="pill bad">anulada</span> : null}
          </div>
          <div className="muted">{s.fecha_cierre} · procesó {s.procesada_por}</div>
        </div>
        <div className="amount pos">{s.totalFmt}</div>
        <div className="muted">{abierta ? '▾' : '▸'}</div>
      </div>

      {abierta ? (
        <>
          {anulada ? (
            <div className="alert warn">
              Anulada por {s.anulada_por}. Motivo: {s.motivo_anulacion}. Puedes volver a procesar esta semana.
            </div>
          ) : null}

          <div className="scroll" style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th>Persona</th><th>Marcador</th><th className="r">Multa</th><th></th></tr></thead>
              <tbody>
                {s.detalle.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      {m.nombre} {m.emoji ?? ''}
                      {m.estado === 'exenta' ? <> <span className="pill warn">exento</span></> : null}
                      {m.estado === 'anulada' ? <> <span className="pill bad">anulada</span></> : null}
                    </td>
                    <td className="muted">{m.dias}/{m.meta}</td>
                    <td className={'r amount ' + (m.monto > 0 ? 'pos' : 'zero')}>{formatoCOP(m.monto)}</td>
                    <td className="r">
                      {!anulada ? (
                        <button type="button" className="ghost small"
                          onClick={() => setEdit(edit === m.id ? null : m.id)}>editar</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {edit !== null ? (
            <form action={accEdit} className="card" style={{ marginTop: 12, background: 'var(--card2)' }}>
              <input type="hidden" name="multaId" value={edit} />
              <div className="two">
                <div>
                  <label>Días cumplidos</label>
                  <input name="dias" type="number" min={0} max={14}
                    defaultValue={s.detalle.find((m: any) => m.id === edit)?.dias} />
                </div>
                <div>
                  <label>Estado</label>
                  <select name="estado" defaultValue={s.detalle.find((m: any) => m.id === edit)?.estado}>
                    <option value="cobrada">Cobrada</option>
                    <option value="exenta">Exenta por excusa</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>
              </div>
              <label>Motivo</label>
              <input name="motivo" placeholder="Por qué se corrige" />
              {estEdit?.error ? <div className="alert bad">{estEdit.error}</div> : null}
              {estEdit?.ok ? <div className="alert ok">{estEdit.ok}</div> : null}
              <button disabled={pendEdit}>{pendEdit ? 'Guardando…' : 'Guardar corrección'}</button>
            </form>
          ) : null}

          {!anulada ? (
            <form action={accAnular} style={{ marginTop: 12 }}>
              <input type="hidden" name="numero" value={s.numero} />
              <label>Anular la semana completa (revierte todas sus multas)</label>
              <input name="motivo" placeholder="Motivo de la anulación" />
              {estAnular?.error ? <div className="alert bad">{estAnular.error}</div> : null}
              {estAnular?.ok ? <div className="alert ok">{estAnular.ok}</div> : null}
              <button className="danger" disabled={pendAnular}>
                {pendAnular ? 'Anulando…' : `Anular semana ${s.numero}`}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
