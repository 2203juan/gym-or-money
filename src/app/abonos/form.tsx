'use client';
import { useActionState, useState } from 'react';
import { abonar, saldarTodo } from '../acciones';
import { formatoCOP } from '@/lib/multas';

type P = { id: number; nombre: string; saldo: number };

export default function FormAbono({ personas, inicial }: { personas: P[]; inicial?: number }) {
  const porDefecto =
    inicial && personas.some((p) => p.id === inicial) ? inicial : (personas[0]?.id ?? 0);
  const [sel, setSel] = useState<number>(porDefecto);
  const [est, abonarAcc, pend] = useActionState(abonar, null);
  const [estT, saldarAcc, pendT] = useActionState(saldarTodo, null);
  const persona = personas.find((p) => p.id === sel);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  return (
    <div className="forma">
      <div className="campo">
        <label className="campo__l" htmlFor="personaId">Persona</label>
        <select id="personaId" value={sel} onChange={(e) => setSel(Number(e.target.value))}>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} — {p.saldo < 0 ? `a favor ${formatoCOP(-p.saldo)}` : `debe ${formatoCOP(p.saldo)}`}
            </option>
          ))}
        </select>
      </div>

      <form action={abonarAcc} className="forma">
        <input type="hidden" name="personaId" value={sel} />
        <div className="duo">
          <div className="campo">
            <label className="campo__l" htmlFor="monto">Monto</label>
            <input id="monto" name="monto" inputMode="numeric" placeholder="35000" />
          </div>
          <div className="campo">
            <label className="campo__l" htmlFor="fecha">Fecha</label>
            <input id="fecha" name="fecha" type="date" defaultValue={hoy} />
          </div>
        </div>
        <div className="campo">
          <label className="campo__l" htmlFor="nota">Nota</label>
          <input id="nota" name="nota" placeholder="Nequi, efectivo…" />
        </div>
        {est?.error ? <div className="aviso aviso--malo">{est.error}</div> : null}
        {est?.ok ? <div className="aviso aviso--ok">{est.ok}</div> : null}
        <button className="boton" disabled={pend}>{pend ? 'Guardando…' : 'Registrar abono'}</button>
      </form>

      {persona && persona.saldo > 0 ? (
        <form action={saldarAcc}>
          <input type="hidden" name="personaId" value={sel} />
          {estT?.error ? <div className="aviso aviso--malo">{estT.error}</div> : null}
          {estT?.ok ? <div className="aviso aviso--ok">{estT.ok}</div> : null}
          <button className="boton boton--sec" disabled={pendT}>
            {pendT ? 'Saldando…' : `Saldar todo · ${formatoCOP(persona.saldo)}`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
