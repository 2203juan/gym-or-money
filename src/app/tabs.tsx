'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', ico: '🏆', label: 'Saldos' },
  { href: '/procesar', ico: '📥', label: 'Procesar' },
  { href: '/semanas', ico: '🗓', label: 'Semanas' },
  { href: '/abonos', ico: '💵', label: 'Abonos' },
  { href: '/bitacora', ico: '📜', label: 'Bitácora' },
];

export default function Tabs() {
  const path = usePathname();
  if (path === '/login') return null;
  return (
    <nav className="tabs">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={path === i.href ? 'on' : ''}>
          <span className="ico">{i.ico}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
