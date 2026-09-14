import type { MetadataRoute } from 'next';

/**
 * Manifiesto para "Añadir a pantalla de inicio".
 * standalone = se abre sin la barra de Safari, como una app de verdad.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ejercicio o Money',
    short_name: 'Ejercicio',          // iOS corta cerca de 12 caracteres
    description: 'Multas semanales del grupo',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es-CO',
    background_color: '#317D35',      // pantalla de arranque
    theme_color: '#317D35',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android recorta el icono a su propia forma: esta version deja margen.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
