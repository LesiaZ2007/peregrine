'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStored } from '@/lib/store';
import { Mark } from './icons';

type Theme = 'auto' | 'light' | 'dark';
const NEXT: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<Theme, string> = { auto: 'Auto', light: 'Day', dark: 'Night' };

export default function TopBar() {
  const path = usePathname();
  const [theme, setTheme] = useStored<Theme>('pg:theme', 'auto');

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'auto') delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);

  const nav = [
    { href: '/', label: 'Plan' },
    { href: '/trips', label: 'Trips' },
    { href: '/compare', label: 'Compare' },
    { href: '/about', label: 'How it works' },
  ];
  return (
    <header className="bar">
      <Link href="/" className="brand" aria-label="Peregrine home">
        <Mark className="brand-mark" />
        <span className="brand-word">Peregrine</span>
      </Link>
      <nav>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="bar-right">
        <button className="btn small ghost" onClick={() => setTheme(NEXT[theme])} title="Switch day / night chart">
          <ThemeGlyph theme={theme} /> {LABEL[theme]}
        </button>
      </div>
    </header>
  );
}

function ThemeGlyph({ theme }: { theme: Theme }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      {theme === 'dark' ? (
        <path d="M11.5 10.5A5 5 0 0 1 5.5 4.5a5 5 0 1 0 6 6Z" fill="currentColor" />
      ) : theme === 'light' ? (
        <>
          <circle cx="8" cy="8" r="3" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="8" y1="1.5" x2="8" y2="3" stroke="currentColor" strokeWidth="1.4" transform={`rotate(${a} 8 8)`} />
          ))}
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
