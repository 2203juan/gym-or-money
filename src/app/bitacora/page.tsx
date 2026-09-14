import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ETIQUETAS: Record<string, string> = {
  semana_procesada: 'Procesó una semana',
  semana_anulada: 'Anuló una semana',
  multa_editada: 'Corrigió una multa',
  abono_registrado: 'Registró un abono',
  saldo_inicial_fijado: 'Fijó un saldo inicial',
  alias_actualizados: 'Actualizó alias',
  telegram_recibido: 'Mensaje recibido por Telegram',
  telegram_ignorado: 'Mensaje de Telegram ignorado',
};

export default async function Bitacora() {
  if (!(await usuarioActual())) redirect('/login');
  const filas = await q<any>(
    `select id, accion, autor, detalle, to_char(creado_en at time zone 'America/Bogota',
     'YYYY-MM-DD HH24:MI') as cuando from multas.bitacora order by creado_en desc limit 200`);

  return (
    <>
      <h1>Bitácora</h1>
      <p className="sub">Toda acción queda registrada con autor y fecha. Nadie es administrador, así que esto es lo que nos mantiene honestos.</p>
      {filas.map((f: any) => (
        <div key={f.id} className="card">
          <div className="row">
            <div className="grow">
              <div className="name">{ETIQUETAS[f.accion] ?? f.accion}</div>
              <div className="muted">{f.autor}</div>
            </div>
            <div className="muted">{f.cuando}</div>
          </div>
          <div className="muted" style={{ marginTop: 6, fontFamily: 'ui-monospace, monospace', fontSize: 12, wordBreak: 'break-word' }}>
            {JSON.stringify(f.detalle)}
          </div>
        </div>
      ))}
      {filas.length === 0 ? <div className="card muted">Sin movimientos todavía.</div> : null}
    </>
  );
}
