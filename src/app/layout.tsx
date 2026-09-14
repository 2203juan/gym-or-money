// Fuentes variables autoalojadas: se empaquetan con la app, sin peticiones a
// terceros y sin depender de que Google Fonts esté disponible al compilar.
import '@fontsource-variable/archivo';
import '@fontsource-variable/big-shoulders-display';
import './globals.css';

import type { Metadata, Viewport } from 'next';
import { usuarioActual } from '@/lib/auth';
import Nav from './nav';

export const metadata: Metadata = {
  title: 'Ejercicio o Money',
  description: 'Multas semanales del grupo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16181C' },
    { media: '(prefers-color-scheme: dark)', color: '#121417' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  return (
    <html lang="es">
      <body>
        <div className="pantalla">
          <div className="cuerpo">{children}</div>
          {usuario ? <Nav /> : null}
        </div>
      </body>
    </html>
  );
}
