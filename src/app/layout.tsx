import './globals.css';
import type { Metadata, Viewport } from 'next';
import { usuarioActual } from '@/lib/auth';
import Barra from './barra';

export const metadata: Metadata = {
  title: 'Ejercicio o Money',
  description: 'Multas semanales del grupo',
  applicationName: 'Ejercicio o Money',
  // Con esto, al añadirla a la pantalla de inicio se abre a pantalla completa
  // y con el nombre corto debajo del icono.
  appleWebApp: {
    capable: true,
    title: 'Ejercicio',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  return (
    <html lang="es">
      <body>
        <main className="pantalla">{children}</main>
        {usuario ? <Barra /> : null}
      </body>
    </html>
  );
}
