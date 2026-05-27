'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Search' },
  { href: '/watchlist', label: 'Watchlist' },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      background: 'var(--navy)',
      boxShadow: '0 2px 16px rgba(0,0,0,.18)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 20px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36,
            background: '#fff',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            flexShrink: 0,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Peregrine falcon logo"
              width={28}
              height={28}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <span style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: 19,
            letterSpacing: '-0.3px',
          }}>
            Peregrine
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hide-mobile">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: pathname === link.href ? '#fff' : 'rgba(255,255,255,.65)',
                fontWeight: 600,
                fontSize: 14,
                padding: '6px 14px',
                borderRadius: 'var(--r-sm)',
                textDecoration: 'none',
                background: pathname === link.href ? 'rgba(255,255,255,.12)' : 'transparent',
                transition: 'all .15s',
              }}
              onMouseEnter={e => {
                if (pathname !== link.href) {
                  e.currentTarget.style.background = 'rgba(255,255,255,.08)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={e => {
                if (pathname !== link.href) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,.65)';
                }
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/watchlist" className="hide-mobile" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,.8)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 'var(--r-sm)',
            border: '1.5px solid rgba(255,255,255,.2)',
            transition: 'all .15s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,.8)';
            }}
          >
            <Eye size={14} />
            Watchlist
          </Link>

          {/* Mobile menu button */}
          <button
            className="hide-desktop"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,.1)',
              border: 'none', cursor: 'pointer',
              color: '#fff', borderRadius: 8,
              padding: 7, display: 'flex',
            }}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="hide-desktop" style={{
          background: 'var(--navy-dark)',
          borderTop: '1px solid rgba(255,255,255,.1)',
          padding: '8px 20px 12px',
        }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                color: pathname === link.href ? '#fff' : 'rgba(255,255,255,.7)',
                fontWeight: 600,
                fontSize: 15,
                padding: '10px 0',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,.07)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

