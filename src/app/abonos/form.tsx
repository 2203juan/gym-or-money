'use client';
import { useActionState, useState } from 'react';
import { abonar, saldarTodo } from '../acciones';
import { formatoCOP } from '@/lib/multas';

type P = { id: number; nombre: string; saldo: number };

export default function FormAbono({ personas }: { personas: P[] }) {
  const [sel, setSel] = useState<number>(personas[0]?.id ?? 0);
  const [est, acc, pend] = useActionState(abonar, null);
  const [estT, accT, pendT] = useActionState(saldarTodo, null);
  const persona = personas.find((p) => p.id === sel);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  return (
    <div className="card">
      <label htmlFor="personaId">Persona</label>
      <select id="personaId" value={sel} onChange={(e) => setSel(Number(e.target.value))}>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre} — debe {formatoCOP(p.saldo)}</option>
        ))}
      </select>

      <form action={acc}>
        <input type="hidden" name="personaId" value={sel} />
        <div className="two">
          <div>
            <label htmlFor="monto">Monto</label>
            <input id="monto" name="monto" inputMode="numeric" placeholder="35000" />
          </div>
          <div>
            <label htmlFor="fecha">Fecha</label>
            <input id="fecha" name="fecha" type="date" defaultValue={hoy} />
          </div>
        </div>
        <label htmlFor="nota">Nota (opcional)</label>
        <input id="nota" name="nota" placeholder="Nequi, efectivo…" />
        {est?.error ? <div className="alert bad">{est.error}</div> : null}
        {est?.ok ? <div className="alert ok">{est.ok}</div> : null}
        <button disabled={pend}>{pend ? 'Guardando…' : 'Registrar abono'}</button>
      </form>

      {persona && persona.saldo > 0 ? (
        <form action={accT}>
          <input type="hidden" name="personaId" value={sel} />
          {estT?.error ? <div className="alert bad">{estT.error}</div> : null}
          {estT?.ok ? <div className="alert ok">{estT.ok}</div> : null}
          <button className="ghost" disabled={pendT}>
            {pendT ? 'Saldando…' : `Saldar todo — ${formatoCOP(persona.saldo)}`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
