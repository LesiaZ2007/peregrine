import { Share2 } from 'lucide-react';

export default function SharePage({ params }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, background: 'var(--blue-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Share2 size={24} color="var(--blue)" />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>Shared Trip Plan</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>
        Plan ID: <code style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 6 }}>{params.id}</code>
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Shared trip plans will be rendered here once the share feature is complete.
      </p>
    </div>
  );
}
