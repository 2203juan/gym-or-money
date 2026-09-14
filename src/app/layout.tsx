import './globals.css';
import type { Metadata, Viewport } from 'next';
import { usuarioActual } from '@/lib/auth';
import Tabs from './tabs';

export const metadata: Metadata = {
  title: 'Ejercicio o Money',
  description: 'Multas semanales del grupo',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f1115' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  return (
    <html lang="es">
      <body>
        <div className="wrap">{children}</div>
        {usuario ? <Tabs /> : null}
      </body>
    </html>
  );
}
