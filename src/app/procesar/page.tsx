import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import Procesar from './form';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await usuarioActual())) redirect('/login');
  return (
    <>
      <header className="barra">
        <Link href="/">← Saldos</Link>
        <span>Procesar</span>
      </header>
      <Procesar />
    </>
  );
}
