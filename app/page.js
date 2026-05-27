'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronDown, ChevronUp, TrendingDown, Shield, Zap, Globe } from 'lucide-react';
import TripTypeToggle from '@/components/TripTypeToggle';
import OriginPicker from '@/components/OriginPicker';
import DestinationPicker from '@/components/DestinationPicker';
import DateRangePicker from '@/components/DateRangePicker';
import LayoverSettings from '@/components/LayoverSettings';

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];

export default function HomePage() {
  const router = useRouter();

  const [tripType, setTripType] = useState('roundtrip');
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [dates, setDates] = useState({ earliestDep: null, latestReturn: null, durationDays: 7, blackouts: new Set() });
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
  const [cabinClass, setCabinClass] = useState('Economy');
  const [budget, setBudget] = useState('');
  const [layoverOpts, setLayoverOpts] = useState(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [passengerOpen, setPassengerOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const validate = () => {
    const e = {};
    if (origins.length === 0)      e.origins      = 'Select at least one departure airport';
    if (destinations.length === 0) e.destinations = 'Select at least one destination';
    if (!dates.earliestDep)        e.dates        = 'Select when you can travel';
    return e;
  };

  const handleSearch = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});

    const fmt = (d) => d instanceof Date ? d.toISOString().slice(0, 10) : (d || '');

    const params = new URLSearchParams({
      origins:      origins.map(o => o.code).join(','),
      destinations: destinations.map(d => d.code).join(','),
      tripType,
      earliestDep:  fmt(dates.earliestDep),
      latestReturn: fmt(dates.latestReturn || dates.earliestDep),
      duration:     dates.durationDays || 7,
      blackouts:    [...(dates.blackouts || [])].join(','),
      adults:       passengers.adults,
      children:     passengers.children,
      infants:      passengers.infants,
      cabin:        cabinClass,
      budget:       budget || '',
      layovers:     [...layoverOpts].join(','),
    });
    router.push(`/results?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(160deg, var(--navy) 0%, #1a4480 60%, #1e5fa0 100%)',
        padding: '56px 20px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 'var(--r-full)', background: 'rgba(14,165,233,.2)', border: '1px solid rgba(14,165,233,.3)', color: '#7dd3fc', fontSize: 12, fontWeight: 700, marginBottom: 20, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            <Zap size={11} /> Smart flight search with price predictions
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.15 }}>
            Find your cheapest flight,<br />
            <span style={{ color: '#7dd3fc' }}>not just the next one</span>
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.7)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6, fontWeight: 400 }}>
            Compare multiple destinations, predict price trends, and know exactly when to book.
          </p>
        </div>
      </div>

      {/* Search card */}
      <div style={{ maxWidth: 900, margin: '-44px auto 0', padding: '0 20px 60px' }}>
        <div className="card" style={{ boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--r-xl)' }}>
          {/* Trip type + passengers */}
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <TripTypeToggle value={tripType} onChange={setTripType} />
            <PassengerSelector
              value={passengers} onChange={setPassengers}
              cabin={cabinClass} onCabinChange={setCabinClass}
              open={passengerOpen} setOpen={setPassengerOpen}
              total={totalPassengers}
            />
          </div>

          {/* Main fields */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <OriginPicker value={origins} onChange={setOrigins} />
                {errors.origins && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.origins}</div>}
              </div>
              <div>
                <DestinationPicker value={destinations} onChange={setDestinations} />
                {errors.destinations && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.destinations}</div>}
              </div>
              <div>
                <DateRangePicker value={dates} onChange={setDates} tripType={tripType} />
                {errors.dates && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.dates}</div>}
              </div>
            </div>

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: '4px 0', marginBottom: showAdvanced ? 12 : 0 }}>
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showAdvanced ? 'Hide' : 'Show'} advanced options (budget, layovers)
            </button>

            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Budget per person (USD) — flights over this are flagged, never hidden
                  </label>
                  <input type="number" className="field" placeholder="e.g. 1200" value={budget} onChange={e => setBudget(e.target.value)} min={0} style={{ maxWidth: 200 }} />
                </div>
                <LayoverSettings value={layoverOpts} onChange={setLayoverOpts} />
              </div>
            )}

            <button onClick={handleSearch} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15, borderRadius: 'var(--r-sm)', marginTop: 4 }}>
              <Search size={17} />
              Search Flights
            </button>
          </div>
        </div>

        {/* Value props */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginTop: 32 }}>
          {[
            { icon: TrendingDown, color: 'var(--green)', bg: 'var(--green-bg)', title: 'Price Predictions', desc: 'AI-powered buy/wait/monitor recommendations based on trends and seasonality' },
            { icon: Globe, color: '#0369a1', bg: 'var(--sky-light)', title: 'Multi-Destination', desc: 'Compare up to 5 destinations side-by-side and discover nearby suggestions' },
            { icon: Shield, color: 'var(--amber)', bg: 'var(--amber-bg)', title: 'Price Watchlist', desc: 'Save routes and see price changes every time you return to Peregrine' },
            { icon: Zap, color: 'var(--blue)', bg: 'var(--blue-light)', title: 'Best Price Finder', desc: 'Deep links to Expedia, Booking, Google Flights and more for every result' },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="card" style={{ padding: 18 }}>
              <div style={{ width: 36, height: 36, background: bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PassengerSelector({ value, onChange, cabin, onCabinChange, open, setOpen, total }) {
  const adjust = (type, delta) => {
    const next = { ...value, [type]: Math.max(0, value[type] + delta) };
    if (next.adults < 1) next.adults = 1;
    onChange(next);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-2)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        <Users size={14} />
        {total} passenger{total > 1 ? 's' : ''} · {cabin}
        <ChevronDown size={13} color="var(--text-muted)" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-md)', padding: 18, zIndex: 200, width: 280, animation: 'slide-up .15s var(--ease)' }}>
          {[{ key: 'adults', label: 'Adults', sub: '16+' }, { key: 'children', label: 'Children', sub: '2–15' }, { key: 'infants', label: 'Infants', sub: 'Under 2' }].map(({ key, label, sub }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => adjust(key, -1)} className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 16 }}>−</button>
                <span style={{ fontWeight: 700, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{value[key]}</span>
                <button onClick={() => adjust(key, 1)} className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 16 }}>+</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Cabin class</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {CABIN_CLASSES.map(c => (
                <button key={c} onClick={() => onCabinChange(c)} style={{ padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${cabin === c ? 'var(--blue)' : 'var(--border)'}`, background: cabin === c ? 'var(--blue-light)' : 'var(--surface)', color: cabin === c ? 'var(--blue)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="btn btn-primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}>Done</button>
        </div>
      )}
    </div>
  );
}
