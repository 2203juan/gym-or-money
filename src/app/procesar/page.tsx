import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import Procesar from './form';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await usuarioActual())) redirect('/login');
  return (
    <>
      <div className="titular">
        <div>
          <h1>Procesar</h1>
          <p className="titular__v">Pega el mensaje del grupo</p>
        </div>
      </div>
      <Procesar />
    </>
  );
}
