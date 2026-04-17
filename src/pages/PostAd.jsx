import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, ArrowRight, CreditCard,
  ImagePlus, X, MapPin, Move,
} from 'lucide-react';
import { PROPERTY_TYPES } from '../constants/propertyTypes';

const MAX_PHOTOS = 4;
const STEPS = ['Details', 'Photos & Map', 'Payment'];

/* ── Helpers ── */
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const mapEmbedSrc = (lat, lng) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

const mapLink = (lat, lng) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=15`;

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/* ═══════════════════════════════════════════════════════ */
export default function PostAd() {
  const [step,       setStep]       = useState(1);
  const [formData,   setFormData]   = useState({
    title: '', description: '', type: 'SINGLE_ROOM',
    price: '', address: '', locality: '',
  });
  const [photos,     setPhotos]     = useState([]);
  const [lat,        setLat]        = useState('');
  const [lng,        setLng]        = useState('');
  const [mapError,   setMapError]   = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);

  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const token        = localStorage.getItem('rentrow_token');

  const set = (key) => (e) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  /* ── Photo handlers ── */
  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    const picked = files.slice(0, MAX_PHOTOS - photos.length);
    const encoded = await Promise.all(picked.map(toBase64));
    setPhotos(prev => [...prev, ...encoded]);
    e.target.value = '';
  }, [photos.length]);

  const removePhoto = (idx) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  /* ── Geolocation ── */
  const handleCurrentLocation = () => {
    setMapError(null);
    if (!navigator.geolocation) {
      setMapError('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLat(coords.latitude.toFixed(6));
        setLng(coords.longitude.toFixed(6));
        setLocLoading(false);
      },
      () => {
        setMapError('Unable to get location. Enter coordinates manually.');
        setLocLoading(false);
      }
    );
  };

  /* ── Step 1 → 2 ── */
  const handleStep1 = (e) => {
    e.preventDefault();
    setStep(2);
  };

  /* ── Step 2: Create property in DB ── */
  const handleCreateAd = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('http://localhost:5000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price:    parseFloat(formData.price),
          lat:      lat ? parseFloat(lat) : null,
          lng:      lng ? parseFloat(lng) : null,
          locality: formData.locality.trim() || null,
          images:   photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing.');
      setPropertyId(data.id);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: Payment ── */
  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loadRazorpay();
      if (!res) throw new Error('Razorpay SDK failed to load');

      // 1. Create order
      const orderRes = await fetch('http://localhost:5000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ propertyId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Order creation failed.');

      // 2. Open Razorpay Widget
      const options = {
        key: 'rzp_test_placeholder', // REPLACE THIS with your Razorpay Key ID
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'RentRow',
        description: 'Listing Fee',
        order_id: orderData.id,
        handler: async function (response) {
          // 3. Verify payment on our backend
          try {
            const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                propertyId
              }),
            });
            const vData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vData.error || 'Verification failed');
            setStep(4);
          } catch(err) {
            setError(err.message);
          }
        },
        theme: { color: '#6366f1' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment Failed');
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Success ── */
  if (step === 4) {
    return (
      <div className="container animate-scale-in">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Listing Published!
          </h2>
          <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.9375rem' }}>
            Your property is now live for the next 30 days.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            View Listings <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-md py-8">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Post Your Ad
        </h1>
        <p className="text-muted text-sm mt-1">
          Fill in the details, add photos, pin your location, and go live.
        </p>
      </div>

      {/* Step indicator */}
      <StepBar current={step} steps={STEPS} />

      {/* Card */}
      <div className="card-elevated animate-fade-up" style={{ padding: '2rem' }}>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ══════ STEP 1: DETAILS ══════ */}
        {step === 1 && (
          <form onSubmit={handleStep1}>
            <SectionLabel n={1} title="Property Details" />

            <div className="form-group">
              <label className="form-label" htmlFor="ad-title">Ad Title</label>
              <input
                id="ad-title"
                type="text"
                className="form-input"
                placeholder="e.g. Spacious 2BHK near Metro Station"
                value={formData.title}
                onChange={set('title')}
                required
              />
            </div>

            {/* Property Type — visual card grid */}
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.625rem',
              }}>
                {PROPERTY_TYPES.map(({ value, label, emoji }) => {
                  const active = formData.type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: value }))}
                      style={{
                        padding: '0.625rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        background: active ? 'var(--primary-subtle)' : 'var(--surface-2)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                        color: active ? 'var(--primary-hover)' : 'var(--text-2)',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{emoji}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-price">Monthly Rent (₹)</label>
                <input
                  id="ad-price"
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 12,000"
                  value={formData.price}
                  onChange={set('price')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-locality">Locality / Area</label>
                <input
                  id="ad-locality"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lajpat Nagar, Sector 15"
                  value={formData.locality}
                  onChange={set('locality')}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ad-address">Full Address</label>
              <input
                id="ad-address"
                type="text"
                className="form-input"
                placeholder="e.g. Flat 4B, Green Heights, Sector 15, Noida, UP 201301"
                value={formData.address}
                onChange={set('address')}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" htmlFor="ad-desc">Description</label>
              <textarea
                id="ad-desc"
                className="form-input"
                rows={4}
                placeholder="Furnishing, amenities, parking, nearby landmarks, preferred tenant…"
                value={formData.description}
                onChange={set('description')}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg">
              Next: Photos &amp; Location <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ══════ STEP 2: PHOTOS & MAP ══════ */}
        {step === 2 && (
          <form onSubmit={handleCreateAd}>

            <SectionLabel n={2} title="Property Photos" subtitle={`Add up to ${MAX_PHOTOS} photos. First photo is the cover.`} />

            {/* Photo grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              {photos.map((src, idx) => (
                <PhotoThumb key={idx} src={src} onRemove={() => removePhoto(idx)} primary={idx === 0} />
              ))}

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="photo-drop-zone"
                >
                  <ImagePlus size={26} style={{ color: 'var(--primary)' }} />
                  <span>Add Photo</span>
                  <span style={{ fontSize: '0.7rem' }}>{photos.length}/{MAX_PHOTOS}</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <hr className="divider" />

            {/* Map section */}
            <SectionLabel n={3} title="Location on Map" subtitle="Helps tenants find your property easily (optional)" />

            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="lat">Latitude</label>
                <input
                  id="lat"
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 28.6139"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="lng">Longitude</label>
                <input
                  id="lng"
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 77.2090"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCurrentLocation}
              disabled={locLoading}
              style={{ marginBottom: '1rem' }}
            >
              <Move size={14} />
              {locLoading ? 'Detecting…' : 'Use My Current Location'}
            </button>

            {mapError && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--red)', marginBottom: '0.75rem' }}>{mapError}</p>
            )}

            {lat && lng ? (
              <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '0.5rem 0.875rem',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-2)',
                }}>
                  <MapPin size={13} style={{ color: 'var(--primary)' }} />
                  {lat}, {lng}
                  <a href={mapLink(lat, lng)} target="_blank" rel="noreferrer"
                    style={{ marginLeft: 'auto', color: 'var(--primary-hover)', fontWeight: 500 }}>
                    Open in Maps ↗
                  </a>
                </div>
                <iframe
                  title="Map preview"
                  src={mapEmbedSrc(lat, lng)}
                  width="100%" height="260"
                  style={{ border: 'none', display: 'block' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div style={{
                height: '160px',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)',
                background: 'var(--surface-2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: 'var(--text-3)',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}>
                <MapPin size={26} style={{ color: 'var(--border)' }} />
                Map preview will appear here
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'Saving…' : 'Save & Continue to Payment'} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ══════ STEP 3: PAYMENT ══════ */}
        {step === 3 && (
          <div className="animate-fade-up" style={{ textAlign: 'center' }}>
            <CreditCard size={40} style={{ margin: '0 auto 1.25rem', color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
              Publish Your Listing
            </h2>
            <p className="text-muted" style={{ fontSize: '0.9375rem', marginBottom: '1.75rem' }}>
              A small fee keeps the platform spam-free.
            </p>
            <div className="price-box">
              <div className="price-amount">₹5</div>
              <div className="price-period">one-time · valid for 30 days</div>
            </div>
            <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {['Your ad goes live immediately', 'Visible to thousands of tenants', 'Direct contact from interested renters'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={handlePayment} className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Processing…' : 'Pay ₹5 & Publish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StepBar({ current, steps }) {
  return (
    <div className="steps" style={{ marginBottom: '2rem' }}>
      {steps.map((label, idx) => {
        const num    = idx + 1;
        const active = current === num;
        const done   = current > num;
        return (
          <div key={label} className="step-item">
            <div className={`step-circle ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              {done ? '✓' : num}
            </div>
            <span className="hide-mobile" style={{
              marginLeft: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-1)' : 'var(--text-3)',
            }}>
              {label}
            </span>
            {idx < steps.length - 1 && <div className={`step-line ${done ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ n, title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.2rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--primary-subtle)', border: '1px solid rgba(99,102,241,0.3)',
          fontSize: '0.625rem', fontWeight: 700, color: 'var(--primary-hover)',
        }}>{n}</span>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
      </div>
      {subtitle && <p className="text-faint text-sm" style={{ marginLeft: '1.875rem' }}>{subtitle}</p>}
    </div>
  );
}

function PhotoThumb({ src, onRemove, primary }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      border: primary ? '2px solid var(--primary)' : '1px solid var(--border)',
    }}>
      <img src={src} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      {primary && (
        <span style={{
          position: 'absolute', top: 8, left: 8,
          background: 'var(--primary)', color: '#fff',
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em',
          padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)',
        }}>COVER</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%',
          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
