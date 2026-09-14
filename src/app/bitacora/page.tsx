import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { usuarioActual } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ETIQUETAS: Record<string, string> = {
  semana_procesada: 'Procesó una semana',
  semana_anulada: 'Anuló una semana',
  multa_editada: 'Corrigió una multa',
  abono_registrado: 'Registró un abono',
  saldo_inicial_fijado: 'Fijó un saldo inicial',
  saldo_inicial_migrado: 'Migró los saldos de Splitwise',
  alias_actualizados: 'Actualizó alias',
  telegram_recibido: 'Mensaje recibido por Telegram',
};

function resumir(accion: string, d: any): string {
  if (!d || typeof d !== 'object') return '';
  switch (accion) {
    case 'semana_procesada': return `Semana ${d.semana} · ${d.multas} multas`;
    case 'semana_anulada': return `Semana ${d.semana} · ${d.motivo ?? 'sin motivo'}`;
    case 'abono_registrado': return `${d.persona}`;
    case 'multa_editada': return `${d.persona}`;
    case 'telegram_recibido': return `Semana ${d.semana ?? '?'}`;
    case 'saldo_inicial_fijado': return `${d.persona}`;
    case 'saldo_inicial_migrado': return `${d.personas} personas · ${d.origen}`;
    case 'alias_actualizados': return (d.alias ?? []).slice(0, 3).join(', ');
    default: return '';
  }
}

export default async function Bitacora() {
  if (!(await usuarioActual())) redirect('/login');
  const filas = await q<any>(
    `select id, accion, autor, detalle,
            to_char(creado_en at time zone 'America/Bogota', 'DD Mon · HH24:MI') as cuando
     from multas.bitacora order by creado_en desc limit 200`,
  );

  return (
    <>
      <div className="titular">
        <div>
          <h1>Bitácora</h1>
          <p className="titular__v">Nadie es administrador. Esto nos mantiene honestos.</p>
        </div>
      </div>

      <div className="tarjeta">
        <div className="cab">
          <ScrollText size={17} color="var(--indigo)" aria-hidden />
          <span className="cab__t" style={{ color: 'var(--indigo)' }}>Acciones registradas</span>
        </div>
        <p className="cifra"><b>{filas.length}</b><span>movimientos</span></p>
      </div>

      <div className="tarjeta tarjeta--lista">
        {filas.map((f: any) => (
          <div className="fila" key={f.id}>
            <span className="fila__n">
              <span className="fila__nm">{ETIQUETAS[f.accion] ?? f.accion}</span>
              <span className="fila__s">
                {f.autor}{resumir(f.accion, f.detalle) ? ` · ${resumir(f.accion, f.detalle)}` : ''}
              </span>
            </span>
            <span className="fila__s" style={{ whiteSpace: 'nowrap' }}>{f.cuando}</span>
          </div>
        ))}
        {filas.length === 0 ? <p className="vacio">Sin movimientos todavía.</p> : null}
      </div>
    </>
  );
}
