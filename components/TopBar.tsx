'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CURRENCIES, CURRENCY_NAME } from '@/lib/money';
import { DEFAULT_SPEC, normalizeSpec } from '@/lib/spec';
import { K, useStored } from '@/lib/store';
import type { Currency, SearchSpec } from '@/lib/types';
import { Mark } from './icons';

type Theme = 'auto' | 'light' | 'dark';
const NEXT: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<Theme, string> = { auto: 'Auto', light: 'Day', dark: 'Night' };

export default function TopBar() {
  const path = usePathname();
  const [theme, setTheme] = useStored<Theme>('pg:theme', 'auto');
  const [spec, setSpec] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const cur = normalizeSpec(spec).currency;
  // phones: pages, currency and theme live behind one menu button
  const [menu, setMenu] = useState(false);
  const [menuPath, setMenuPath] = useState(path);
  if (menuPath !== path) { setMenuPath(path); setMenu(false); }
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'auto') delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);

  const nav = [
    { href: '/', label: 'Plan' },
    { href: '/place', label: 'Look up' },
    { href: '/trips', label: 'Trips' },
    { href: '/compare', label: 'Compare' },
    { href: '/about', label: 'How it works' },
  ];
  return (
    <header className="bar" data-menu={menu}>
      <Link href="/" className="brand" aria-label="Peregrine home">
        <Mark className="brand-mark" />
        <span className="brand-word">Peregrine</span>
      </Link>
      <span className="bar-page">{nav.find((n) => n.href === path)?.label ?? ''}</span>
      <button type="button" className="menu-btn" aria-expanded={menu} aria-controls="bar-menu" onClick={() => setMenu((v) => !v)}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          {menu ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
        <span>{menu ? 'Close' : 'Menu'}</span>
      </button>
      {menu && <button type="button" className="bar-scrim" aria-label="Close menu" onClick={() => setMenu(false)} />}
      <div className="bar-menu" id="bar-menu">
      <nav>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="bar-right">
        <label className="cur-switch" title="Show prices in (approximate rates)">
          <span className="vh">Currency</span>
          <select value={cur} onChange={(e) => setSpec((s) => ({ ...normalizeSpec(s), currency: e.target.value as Currency }))}>
            {CURRENCIES.map((c) => <option key={c} value={c} title={CURRENCY_NAME[c]}>{c}</option>)}
          </select>
        </label>
        <button className="btn small ghost" onClick={() => setTheme(NEXT[theme])} title="Switch day / night chart">
          <ThemeGlyph theme={theme} /> <span className="theme-word">{LABEL[theme]}</span>
        </button>
      </div>
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
