'use client';
import { ArrowLeftRight, ArrowRight, GitBranch } from 'lucide-react';

const TYPES = [
  { id: 'roundtrip', label: 'Round Trip', icon: ArrowLeftRight },
  { id: 'oneway',    label: 'One Way',    icon: ArrowRight },
  { id: 'multicity', label: 'Multi-City', icon: GitBranch },
];

export default function TripTypeToggle({ value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--bg-2)',
      border: '1.5px solid var(--border-2)',
      borderRadius: 'var(--r-sm)',
      padding: 3,
      gap: 2,
    }}>
      {TYPES.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 14px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all .15s',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--blue)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
