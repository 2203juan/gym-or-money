import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import Procesar from './form';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await usuarioActual())) redirect('/login');
  return (
    <>
      <h1>Procesar una semana</h1>
      <p className="sub">Pega aquí el mensaje de resumen del grupo. Verás el detalle antes de registrar nada.</p>
      <Procesar />
    </>
  );
}
