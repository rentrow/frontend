import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, MapPin, ChevronLeft, ChevronRight, ExternalLink,
  X, Navigation, Loader2, MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PROPERTY_TYPES, TYPE_LABEL, TYPE_EMOJI } from '../constants/propertyTypes';
import { useAuth } from '../context/AuthContext';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';
const DEFAULT_RADIUS_KM = 4;

// Use environment variable or fallback to Render backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-sfrm.onrender.com';

const mapsUrl = (lat, lng) =>
  lat && lng ? `https://www.google.com/maps?q=${lat},${lng}&z=15` : null;

/* Geocode via OpenStreetMap Nominatim (free, no key) */
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) throw new Error('Location not found');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name.split(',')[0] };
}

/* ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [properties,    setProperties]    = useState([]);
  const [loading,       setLoading]       = useState(true);

  /* Text search */
  const [search,        setSearch]        = useState('');
  const [debSearch,     setDebSearch]     = useState('');

  /* Type filter */
  const [activeType,    setActiveType]    = useState('');

  /* Locality filter */
  const [activeLocality,setActiveLocality]= useState('');
  const [localities,    setLocalities]    = useState([]);

  /* Proximity (location-based) */
  const [locationText,  setLocationText]  = useState('');
  const [proxCoords,    setProxCoords]    = useState(null);  // { lat, lng, display }
  const [geoLoading,    setGeoLoading]    = useState(false);
  const [geoError,      setGeoError]      = useState(null);
  const [radius,        setRadius]        = useState(DEFAULT_RADIUS_KM);

  /* Debounce text search */
  const debRef = useRef();
  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(debRef.current);
  }, [search]);

  /* Build API URL */
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (activeType)      p.set('type',     activeType);
    if (activeLocality)  p.set('locality', activeLocality);
    if (debSearch)       p.set('search',   debSearch);
    if (proxCoords) {
      p.set('lat',    proxCoords.lat);
      p.set('lng',    proxCoords.lng);
      p.set('radius', radius);
    }
    // CHANGED: Use API_BASE_URL instead of localhost
    return `${API_BASE_URL}/api/properties?${p}`;
  }, [activeType, activeLocality, debSearch, proxCoords, radius]);

  /* Fetch properties */
  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then(r => r.json())
      .then(d => { setProperties(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [buildUrl]);

  /* Fetch localities once on mount */
  useEffect(() => {
    // CHANGED: Use API_BASE_URL instead of localhost
    fetch(`${API_BASE_URL}/api/properties`)
      .then(r => r.json())
      .then(d => {
        const locs = [...new Set(d.map(p => p.locality).filter(Boolean))].sort();
        setLocalities(locs);
      }).catch(() => {});
  }, []);

  /* Geocode location text */
  const handleGeoSearch = async () => {
    if (!locationText.trim()) return;
    setGeoLoading(true); setGeoError(null);
    try {
      const coords = await geocode(locationText + ', India');
      setProxCoords(coords);
    } catch (e) {
      setGeoError(e.message);
    } finally {
      setGeoLoading(false);
    }
  };

  /* Use browser GPS */
  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProxCoords({ lat: coords.latitude, lng: coords.longitude, display: 'Your location' });
        setLocationText('Your location');
        setGeoLoading(false);
      },
      () => { setGeoError('Could not get location'); setGeoLoading(false); }
    );
  };

  const clearProximity = () => { setProxCoords(null); setLocationText(''); setGeoError(null); };
  const clearAll = () => { setSearch(''); setActiveType(''); setActiveLocality(''); clearProximity(); };
  const hasFilters = !!(activeType || activeLocality || debSearch || proxCoords);

  return (
    <div className="animate-fade-up">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-eyebrow"><span>🏙️</span> India's growing rental network</div>
          <h1 className="hero-title">Find Your Next<br />Perfect Space</h1>
          <p className="hero-subtitle">
            Rooms, flats, houses, and commercial spaces — browse verified listings right in your neighbourhood.
          </p>

          {/* Text search */}
          <div className="search-wrapper" style={{ maxWidth: 600, margin: '0 auto 1rem' }}>
            <span className="search-icon"><Search size={18} /></span>
            <input
              className="search-input"
              placeholder="Search by title, address, or area…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-ghost btn-sm" style={{ margin: '0.3rem', padding: '0.3rem' }} onClick={() => setSearch('')}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Proximity search row */}
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="search-wrapper" style={{ flex: 1 }}>
              <span className="search-icon"><MapPin size={16} /></span>
              <input
                className="search-input"
                placeholder="Search near a location… (e.g. Somalwada)"
                value={locationText}
                onChange={e => setLocationText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGeoSearch()}
              />
              {proxCoords && (
                <button className="btn btn-ghost btn-sm" style={{ margin: '0.3rem', padding: '0.3rem' }} onClick={clearProximity}>
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleGeoSearch}
              disabled={geoLoading || !locationText}
              style={{ flexShrink: 0 }}
            >
              {geoLoading ? <Loader2 size={14} className="spin" /> : 'Go'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleMyLocation}
              disabled={geoLoading}
              title="Use my location"
              style={{ flexShrink: 0 }}
            >
              <Navigation size={14} />
            </button>
          </div>

          {/* Proximity active strip */}
          {proxCoords && (
            <div style={{ maxWidth: 600, margin: '0.75rem auto 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={13}/> Showing within {radius} km of <strong>{proxCoords.display}</strong>
              </span>
              <input
                type="range" min={1} max={20} value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                style={{ width: 100, accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', minWidth: 30 }}>{radius} km</span>
            </div>
          )}

          {geoError && (
            <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>{geoError}</p>
          )}
        </div>
      </section>

      {/* ── Sticky Filter Bar ─────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 'var(--nav-height)', zIndex: 40,
        background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>

          {/* Property type chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Type</span>
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }} className="hide-scrollbar">
              <FilterChip emoji="🏠" label="All" active={!activeType} onClick={() => setActiveType('')} />
              {PROPERTY_TYPES.map(({ value, label, emoji }) => (
                <FilterChip key={value} emoji={emoji} label={label}
                  active={activeType === value}
                  onClick={() => setActiveType(p => p === value ? '' : value)} />
              ))}
            </div>
          </div>

          {/* Locality chips */}
          {localities.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Area</span>
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }} className="hide-scrollbar">
                <LocalityChip label="All areas" active={!activeLocality} onClick={() => setActiveLocality('')} />
                {localities.map(loc => (
                  <LocalityChip key={loc} label={loc} active={activeLocality === loc}
                    onClick={() => setActiveLocality(p => p === loc ? '' : loc)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Listings ─────────────────────────────────────── */}
      <section className="container py-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="section-title">
              {proxCoords ? `Near ${proxCoords.display}` : activeType ? TYPE_LABEL[activeType] + ' Listings' : 'Latest Listings'}
            </h2>
            <p className="text-faint text-sm mt-1">
              {loading ? 'Loading…' : `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} found`}
            </p>
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ color: 'var(--red)' }}>
              <X size={13} /> Clear all
            </button>
          )}
        </div>

        {loading ? <LoadingSkeleton /> : properties.length > 0 ? (
          <div className="grid grid-3">
            {properties.map(p => <PropertyCard key={p.id} property={p} currentUser={user} navigate={navigate} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No listings found</div>
            <p className="text-sm mt-1">
              {proxCoords ? `No properties within ${radius} km. Try increasing the radius.` : 'Try adjusting your filters.'}
            </p>
            {hasFilters && <button className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }} onClick={clearAll}>Clear filters</button>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Property Card ──────────────────────────────────────── */
function PropertyCard({ property, currentUser, navigate }) {
  // images may arrive as array (new) or JSON string (legacy)
  const rawImages = property.images;
  const imageArr  = Array.isArray(rawImages)
    ? rawImages
    : (() => { try { return JSON.parse(rawImages) || []; } catch { return []; } })();
  const images  = imageArr.length ? imageArr : [FALLBACK_IMG];
  const mapUrl  = mapsUrl(property.lat, property.lng);
  const [imgIdx, setImgIdx] = useState(0);

  const prev = useCallback(e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); }, [images.length]);
  const next = useCallback(e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); }, [images.length]);

  const handleContact = () => {
    if (!currentUser) { navigate('/login'); return; }
    navigate(`/messages/${property.id}`);
  };

  return (
    <div className="property-card">
      {/* Carousel */}
      <div style={{ position: 'relative', height: 200, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <img src={images[imgIdx]} alt={property.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        {images.length > 1 && (
          <>
            <CarouselBtn side="left"  onClick={prev}><ChevronLeft  size={15}/></CarouselBtn>
            <CarouselBtn side="right" onClick={next}><ChevronRight size={15}/></CarouselBtn>
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
              {images.map((_, i) => (
                <span key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                  style={{ display:'inline-block', width: i===imgIdx?14:5, height:5, borderRadius:3, background: i===imgIdx?'#fff':'rgba(255,255,255,.4)', cursor:'pointer', transition:'width .2s' }} />
              ))}
            </div>
            <span style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:'0.6875rem', fontWeight:600, padding:'0.15rem 0.45rem', borderRadius:'var(--radius-sm)' }}>
              {imgIdx+1}/{images.length}
            </span>
          </>
        )}
        {property.distanceKm !== undefined && (
          <span style={{ position:'absolute', top:10, left:10, background:'rgba(0,0,0,.65)', color:'#fff', fontSize:'0.7rem', fontWeight:700, padding:'0.2rem 0.5rem', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:3 }}>
            <Navigation size={10}/> {property.distanceKm} km away
          </span>
        )}
      </div>

      {/* Body */}
      <div className="property-card__body">
        <div className="property-card__meta">
          <span className="badge badge-primary">{TYPE_EMOJI[property.type]} {TYPE_LABEL[property.type] || property.type}</span>
          <div className="property-card__price">₹{property.price?.toLocaleString('en-IN')}<span> / mo</span></div>
        </div>

        <h3 className="property-card__title">{property.title}</h3>

        {property.locality && (
          <div  style={{ display:'inline-flex', alignItems:'center', gap:4, background:'var(--surface-3)', borderRadius:'var(--radius-sm)', padding:'0.15rem 0.5rem', fontSize:'0.75rem', fontWeight:600, color:'var(--text-2)', marginBottom:'0.375rem' }}>
            📍 {property.locality}
          </div>
        )}

        <div className="property-card__location" style={{ marginBottom: '0.875rem' }}>
          <MapPin size={12} style={{ color:'var(--text-3)', flexShrink:0 }} />
          <span style={{ color:'var(--text-3)' }}>{property.address}</span>
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noreferrer"
              style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:2, fontSize:'0.7rem', fontWeight:600, color:'var(--primary-hover)', flexShrink:0, padding:'0.15rem 0.4rem', borderRadius:'var(--radius-sm)', background:'var(--primary-subtle)' }}>
              <ExternalLink size={10}/> Map
            </a>
          )}
        </div>

        {mapUrl && (
          <div className="map-embed-strip" style={{ height:110, marginBottom:'0.875rem' }}>
            <iframe
              title={`Map – ${property.title}`}
              src={`https://www.google.com/maps?q=${property.lat},${property.lng}&z=15&output=embed`}
              width="100%" height="110" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}

        <button className="btn btn-primary w-full btn-sm" onClick={handleContact}
          style={{ marginBottom:'0.5rem' }}>
          <MessageSquare size={14}/> Contact Landlord
        </button>
        <button className="btn btn-outline w-full btn-sm">View Details</button>
      </div>
    </div>
  );
}

/* ── Tiny chip components ── */
function FilterChip({ emoji, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:3, padding:'0.3rem 0.7rem',
      borderRadius:'var(--radius-full)',
      border:`1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      background: active ? 'var(--primary)' : 'var(--surface-2)',
      color: active ? '#fff' : 'var(--text-2)',
      fontSize:'0.78rem', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
      transition:'all .15s', flexShrink:0,
    }}>
      <span style={{ fontSize:'0.82rem' }}>{emoji}</span>{label}
    </button>
  );
}
function LocalityChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'0.25rem 0.65rem', borderRadius:'var(--radius-full)',
      border:`1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      background: active ? 'var(--primary-subtle)' : 'transparent',
      color: active ? 'var(--primary-hover)' : 'var(--text-3)',
      fontSize:'0.775rem', fontWeight: active ? 700 : 500,
      cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s', flexShrink:0,
    }}>
      {label}
    </button>
  );
}
function CarouselBtn({ side, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      position:'absolute', [side]:8, top:'50%', transform:'translateY(-50%)',
      background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%',
      width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
      cursor:'pointer', color:'#fff', backdropFilter:'blur(4px)',
    }}>{children}</button>
  );
}
function LoadingSkeleton() {
  return (
    <div className="grid grid-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="property-card" style={{ opacity:.4 }}>
          <div style={{ height:200, background:'var(--surface-2)' }} />
          <div className="property-card__body">
            {[...Array(3)].map((_, j) => (
              <div key={j} style={{ height: j===1?16:12, background:'var(--surface-3)', borderRadius:4, marginBottom:8, width: j===2?'55%':'100%' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
