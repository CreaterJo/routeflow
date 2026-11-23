import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Settings, RefreshCw, Upload, Plus, Trash2, Zap, Map as MapIcon, User, Home } from 'lucide-react'
import StepIndicator from './components/StepIndicator'
import AddressInput from './components/AddressInput'
import AddressList from './components/AddressList'
import MapView from './components/MapView'
import OnboardingModal from './components/OnboardingModal'
import { ToastContainer } from './hooks/useToast'
import useToast from './hooks/useToast'
import { geocodeBatch, getRoute, nearestNeighbor2Opt, geocode, parseExcel, storage, generateGoogleMapsLink } from './lib/routing'

// ========== Step 1: Willkomen / Adressen ==========
function StepAddresses({ startAddress, addresses, loading, error, geocodeProgress, user,
  onAddAddresses, onRemoveAddress, onClear, onCalculate,
  onToggleMode, mode }) {
  const [showModal, setShowModal] = useState(false)
  const [fileError, setFileError] = useState('')

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!file) return
    setFileError('')
    try {
      const results = await parseExcel(file)
      if (results.length === 0) {
        setFileError('Keine Adressen in der Datei gefunden.')
        return
      }
      onAddAddresses(results)
      e.target.value = ''
    } catch {
      setFileError('Datei konnte nicht gelesen werden.')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')
    handleFileUpload(e)
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Leaf size={20} color="var(--color-primary)" />
          Adresse(n) hinzufügen
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          Laden Sie eine Excel-Datei oder fügen Sie Adressen manuell hinzu.
        </p>
      </div>

      {/* Startadresse anzeigen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <Home size={18} color="var(--color-primary)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-sm)' }}>Start (Hub)</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            {startAddress.strasse}, {startAddress.plz} {startAddress.ort}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>
          <Settings size={14} /> Ändern
        </button>
      </div>

      <OnboardingModal
        show={showModal}
        user={{ name: user?.name || '', startAddress }}
        onSave={(data) => { 
          storage.set('routeflow_user', { ...user, startAddress: data.startAddress }); 
          setStartAddress(data.startAddress); 
          setShowModal(false); 
        }}
      />

      {/* Upload */}
      <div className="input-group">
        <label className="input-label">Excel-Datei hochladen</label>
        <div
          className="file-upload-area"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input className="file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          <Upload size={28} color="var(--color-primary)" />
          <div>
            <strong>XLSX, XLS oder CSV</strong> hochladen
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              Spalten: strasse, plz, ort
            </div>
          </div>
        </div>
        {fileError && <span className="field-error">{fileError}</span>}

<style>{`
  .file-upload-area { animation: floatIn var(--transition-base) ease-out; }
  @keyframes floatIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`}</style>
      </div>

      {/* Oder manuell */}
      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
        — oder —
      </div>
      <AddressInput label="Adresse manuell eingeben" onAdd={onAddAddresses} />

      {/* Liste */}
      {addresses.length > 0 && (
        <AddressList
          addresses={addresses}
          onAdd={onAddAddresses}
          onRemove={onRemoveAddress}
          error={error}
        />
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {addresses.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onClear}>
              <Trash2 size={14} /> Alle löschen
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onToggleMode}>
            <Settings size={14} /> {mode === 'cloud' ? '☁ Cloud' : '💾 Lokal'}
          </button>
        </div>
        <button
          className="btn btn-primary"
          disabled={addresses.length === 0 || loading}
          onClick={onCalculate}
        >
          {loading ? (
            <><Zap size={16} style={{ animation: 'spin 1s linear infinite' }} /> Berechnen…</>
          ) : (
            <><Zap size={16} /> Route berechnen</>
          )}
        </button>
      </div>

      {/* Fortschritt */}
      {geocodeProgress && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            <span>Geocodiere Adressen…</span>
            <span>{geocodeProgress.current}/{geocodeProgress.total}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(geocodeProgress.current / geocodeProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

// ========== Step 3: Ergebnis ==========
function StepResult({ route, addresses, startAddress, onResetTour, onResetAll }) {
  if (!route) return null
  return (
    <>
      {/* Karte */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <MapIcon size={20} color="var(--color-primary)" /> Deine optimierte Route
        </h3>
        <MapView points={route.points} routeOrder={route.order} distance={route.distance} duration={route.duration} routeGeometry={route.routeGeometry} googleMapsLink={route.googleMapsLink} />
      </div>

      {/* Google Maps Button */}
      {route.googleMapsLink && (
        <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', alignItems: 'center' }}>
          <a
            href={route.googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <span>🗺️</span> Route in Google Maps öffnen
          </a>
        </div>
      )}

      {/* Statistiken */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
          📊 Tour-Statistiken
        </h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Gesamtdistanz</div>
            <div className="stat-value">{(route.distance / 1000).toFixed(1)} km</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Geschätzte Zeit</div>
            <div className="stat-value">{Math.round(route.duration / 60)} Min.</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Stopps</div>
            <div className="stat-value">{route.order.length}</div>
          </div>
          {route.failedCount > 0 && (
            <div className="stat-item">
              <div className="stat-label">Nicht gefunden</div>
              <div className="stat-value stat-value--error">{route.failedCount}</div>
            </div>
          )}
        </div>
      </div>

      {/* Reihenfolge */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
          🗺️ Touren-Reihenfolge
        </h3>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-primary-lighter)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>H</span>
            <span style={{ fontWeight: 'var(--font-semibold)' }}>Start (Hub)</span>
            <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {startAddress.strasse}, {startAddress.plz} {startAddress.ort}
            </span>
          </li>
          {route.order.map((addrIndex, i) => {
            const addr = addresses[addrIndex - 1]
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-secondary)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>{i + 1}</span>
                <span>{addr.strasse}, {addr.plz} {addr.ort}</span>
              </li>
            )
          })}
          {/* Rückkehr zum Start */}
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-primary-lighter)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>🏠</span>
            <span style={{ fontWeight: 'var(--font-semibold)' }}>Zurück zum Start</span>
            <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {startAddress.strasse}, {startAddress.plz} {startAddress.ort}
            </span>
          </li>
        </ol>
      </div>

      {/* Aktionen */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onResetAll}>
          <RefreshCw size={16} /> Ganz neu starten
        </button>
        <button className="btn btn-primary" onClick={onResetTour}>
          <Zap size={16} /> Neue Tour planen
        </button>
      </div>
    </>
  )
}

// ========== Haupt-App ==========
export default function App() {
  const { toast, toasts, dismiss } = useToast()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [step, setStep] = useState(2)
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('local')
  const [startAddress, setStartAddress] = useState({ plz: '', ort: '', strasse: '' })
  const [addresses, setAddresses] = useState([])
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [geocodeProgress, setGeocodeProgress] = useState(null)
  const [stats, setStats] = useState({ totalDeliveries: 0, totalKm: 0 })

  // Onboarding prüfen
  useEffect(() => {
    const saved = storage.get('routeflow_user')
    if (saved) {
      setUser(saved)
      setStartAddress(saved.startAddress || { plz: '', ort: '', strasse: '' })
      const s = storage.get('routeflow_stats')
      if (s) setStats(s)
      // Zur Tour-Seite springen
      setStep(2)
    } else {
      setShowOnboarding(true)
      setStep(4)
    }
  }, [])

  const handleOnboardingSave = (data) => {
    setUser(data)
    setStartAddress(data.startAddress)
    storage.set('routeflow_user', data)
    setShowOnboarding(false)
    setStep(2)
    toast(`Willkommen, ${data.name}! 🎉`, { type: 'success' })
  }

  const addAddresses = (newAddrs) => {
    setAddresses(prev => [...prev, ...newAddrs.map(a => ({ ...a, ok: null }))])
  }

  const removeAddress = (index) => {
    setAddresses(prev => prev.filter((_, i) => i !== index))
  }

  const clearAddresses = () => {
    setAddresses([])
    setRoute(null)
    setError(null)
    setGeocodeProgress(null)
  }

  // Modus wird beibehalten (localStorage), kein Wechsel-Button

  const calculateRoute = async () => {
    if (addresses.length === 0) {
      setError('Lade zuerst eine Excel-Datei oder füge Adressen hinzu.')
      return
    }
    if (!startAddress.plz || !startAddress.ort || !startAddress.strasse) {
      setError('Bitte gib eine vollständige Startadresse ein.')
      return
    }
    if (addresses.length > 35) {
      setError('Maximal 35 Adressen erlaubt.')
      return
    }

    setLoading(true)
    setError(null)
    setGeocodeProgress({ current: 0, total: addresses.length + 1 })

    try {
      // 1. Start geocodieren
      let startCoords
      try {
        startCoords = await geocode(startAddress.strasse, startAddress.plz, startAddress.ort)
      } catch {
        throw new Error(`Startadresse nicht gefunden: ${startAddress.strasse}, ${startAddress.plz} ${startAddress.ort}`)
      }

      // 2. Parallel geocodieren
      const batchResults = await geocodeBatch(
        addresses,
        {
          concurrency: 10,
          onProgress: (done, total) => {
            setGeocodeProgress({ current: 1 + done, total: total + 1 })
          }
        }
      )

      const failed = batchResults.filter(r => !r.ok)
      if (failed.length > 0) {
        toast(`${failed.length} Adresse(n) nicht gefunden`, { type: 'warning' })
      }

      const validResults = batchResults.filter(r => r.ok)
      if (validResults.length === 0) {
        throw new Error('Keine Adresse konnte geocodiert werden.')
      }

      // 3. Punkte (Start = Hub)
      const locationPoints = [
        { ...startCoords, address: `${startAddress.strasse}, ${startAddress.plz} ${startAddress.ort}`, isStart: true }
      ]
      for (const r of validResults) {
        locationPoints.push({ lat: r.lat, lng: r.lng, address: `${r.strasse}, ${r.plz} ${r.ort}`, isStart: false })
      }

      // 4. TSP optimieren (nur Stopps, nicht Start)
      const tourOrder = nearestNeighbor2Opt(locationPoints.slice(1))
      // Route: Start → Stopps → Start zurück (Round Trip)
      const orderedPoints = [
        locationPoints[0],
        ...tourOrder.map(i => locationPoints[i + 1]),
        locationPoints[0] // Zurück zum Start
      ]

      const routeData = await getRoute(orderedPoints)

      const routeGeometryForMap = orderedPoints.map(p => [p.lng, p.lat])
      const googleMapsLink = generateGoogleMapsLink(orderedPoints.map(p => ({ lat: p.lat, lng: p.lng })))

      setRoute({
        points: orderedPoints,
        distance: routeData.distance,
        duration: routeData.duration,
        order: tourOrder.map(i => i + 1),
        failedCount: failed.length,
        routeGeometry: routeData.geometry || routeGeometryForMap,
        googleMapsLink
      })

      // 5. Stats
      const newStats = {
        totalDeliveries: stats.totalDeliveries + validResults.length,
        totalKm: stats.totalKm + routeData.distance / 1000
      }
      setStats(newStats)
      storage.set('routeflow_stats', newStats)

      setStep(4)
      toast(`Tour geplant! ${validResults.length} Stopps, ${(routeData.distance / 1000).toFixed(1)} km`, { type: 'success' })

    } catch (err) {
      setError(err.message)
      toast(err.message, { type: 'error' })
    } finally {
      setLoading(false)
      setGeocodeProgress(null)
    }
  }

  const resetTour = () => {
    setAddresses([])
    setRoute(null)
    setError(null)
    setGeocodeProgress(null)
    setStep(2)
  }

  const resetAll = () => {
    storage.remove('routeflow_user')
    setUser(null)
    setStartAddress({ plz: '', ort: '', strasse: '' })
    setAddresses([])
    setRoute(null)
    setError(null)
    setGeocodeProgress(null)
    setStep(4)
    setShowOnboarding(true)
  }

  const STEPS = [
    { num: 1, label: 'Tour planen' },
    { num: 2, label: 'Adressen' },
    { num: 3, label: 'Berechnen' },
    { num: 4, label: 'Ergebnis' }
  ]

  return (
    <div className="app-root">
      {/* Background Blobs */}
      <div className="bg-blob bg-blob--1" />
      <div className="bg-blob bg-blob--2" />
      <div className="bg-blob bg-blob--3" />

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div className="brand-icon">
              <Leaf size={20} color="white" />
            </div>
            <span className="brand-name">RouteFlow</span>
            <span className="badge" style={{ background: 'var(--color-secondary)', color: 'white', fontSize: 'var(--text-xs)' }}>Beta</span>
          </div>
          <div className="header-meta" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {user && (
              <span className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                <User size={14} /> {user?.name || 'Gast'}
              </span>
            )}
            {stats.totalDeliveries > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {stats.totalDeliveries} Lieferungen · {stats.totalKm.toFixed(1)} km
                  </span>
                </div>
              )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          <div className="layout">
            {/* Step Indicator */}
            <aside className="wizard-sidebar">
              <nav aria-label="Wizard-Schritte">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {STEPS.map(s => (
                    <li key={s.num}>
                      <button
                        className={`step-btn ${step >= s.num ? 'active' : ''}`}
                        onClick={() => { if (step >= s.num) setStep(s.num) }}
                        disabled={step < s.num}
                        aria-current={step === s.num ? 'step' : undefined}
                      >
                        <span className="step-num">{s.num}</span>
                        <span className="step-label">{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Wizard Content */}
            <div className="wizard-content">
              <StepIndicator current={step} total={4} labels={STEPS.map(s => s.label)} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Step 2: Adressen hinzufügen */}
                  {step === 2 && (
                    <StepAddresses
                      startAddress={startAddress}
                      addresses={addresses}
                      loading={loading}
                      error={error}
                      geocodeProgress={geocodeProgress}
                      user={user}
                      onAddAddresses={addAddresses}
                      onRemoveAddress={removeAddress}
                      onClear={clearAddresses}
                      onCalculate={calculateRoute}
                      onToggleMode={toggleMode}
                      mode={mode}
                    />
                  )}

                  {/* Step 4: Ergebnis */}
                  {step === 4 && route && (
                    <StepResult
                      route={route}
                      addresses={addresses}
                      startAddress={startAddress}
                      onResetTour={resetTour}
                      onResetAll={resetAll}
                    />
                  )}

                  {/* Step 4: Noch keine Route (nach Reset) */}
                  {step === 4 && !route && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
                      <Leaf size={48} color="var(--color-primary)" style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Keine Tour geplant</h3>
                      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Füge Adressen hinzu und berechne deine Route.</p>
                      <button className="btn btn-primary" onClick={() => setStep(2)}>
                        <Plus size={16} /> Adresse hinzufügen
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <span>Built with ❤️ by Jakob · RouteFlow · {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Toasts */}
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Onboarding Modal */}
      <OnboardingModal
        show={showOnboarding}
        user={user ?? { name: '', startAddress: { plz: '', ort: '', strasse: '' } }}
        onSave={handleOnboardingSave}
      />
    </div>
  )
}
