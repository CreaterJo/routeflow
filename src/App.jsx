import { useState, useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { parseExcel, geocode, getRoute, nearestNeighbor2Opt, storage } from './lib/routing'
import './App.css'

// Fix für Leaflet Marker Icons in React
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const MODE_KEY = 'routeflow_mode'
const STATS_KEY = 'routeflow_stats'

function App() {
  const [mode, setMode] = useState(() => storage.get(MODE_KEY) || 'local')
  const [addresses, setAddresses] = useState([])
  const [startAddress, setStartAddress] = useState({ plz: '', ort: '', strasse: '' })
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(() => storage.get(STATS_KEY) || { totalDeliveries: 0, totalKm: 0 })
  const [showMap, setShowMap] = useState(false)
  const mapRef = useRef(null)

  // Modus umschalten
  const toggleMode = useCallback(() => {
    const newMode = mode === 'local' ? 'cloud' : 'local'
    setMode(newMode)
    storage.set(MODE_KEY, newMode)
  }, [mode])

  // Datei-Upload
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      setLoading(true)
      setError(null)
      const parsed = await parseExcel(file)
      setAddresses(parsed)
      setRoute(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Route berechnen
  const handleCalculate = useCallback(async () => {
    if (addresses.length === 0) {
      setError('Lade zuerst eine Excel-Datei.')
      return
    }
    if (!startAddress.plz || !startAddress.ort || !startAddress.strasse) {
      setError('Gib eine Startadresse ein.')
      return
    }
    if (addresses.length > 35) {
      setError('Maximal 35 Adressen erlaubt.')
      return
    }

    setLoading(true)
    setError(null)
    setShowMap(false)

    try {
      // Geocodiere Start + alle Adressen
      const startCoords = await geocode(startAddress.strasse, startAddress.plz, startAddress.ort)
      const locationPoints = [
        { ...startCoords, address: `${startAddress.strasse}, ${startAddress.plz} ${startAddress.ort}`, isStart: true }
      ]

      for (const addr of addresses) {
        const coords = await geocode(addr.strasse, addr.plz, addr.ort)
        locationPoints.push({
          ...coords,
          address: `${addr.strasse}, ${addr.plz} ${addr.ort}`,
          isStart: false
        })
      }

      // Route berechnen
      const tourOrder = nearestNeighbor2Opt(locationPoints.slice(1))
      const orderedPoints = [locationPoints[0], ...tourOrder.map((i) => locationPoints[i + 1])]

      const routeData = await getRoute(orderedPoints)

      setRoute({
        points: orderedPoints,
        distance: routeData.distance,
        duration: routeData.duration,
        order: tourOrder.map((i) => i + 1)
      })

      // Statistiken aktualisieren
      const newStats = {
        totalDeliveries: stats.totalDeliveries + addresses.length,
        totalKm: stats.totalKm + routeData.distance / 1000
      }
      setStats(newStats)
      storage.set(STATS_KEY, newStats)
      setShowMap(true)
    } catch (err) {
      setError(`Fehler bei der Routenberechnung: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [addresses, startAddress, stats])

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>RouteFlow</h1>
        <span className={`badge mode-${mode}`}>{mode === 'local' ? 'Lokal' : 'Cloud'}</span>
        <button className="mode-toggle" onClick={toggleMode}>
          {mode === 'local' ? '→ Cloud wechseln' : '→ Lokal wechseln'}
        </button>
      </header>

      <main className="main">
        {/* Eingabe */}
        <section className="card">
          <h2>Startadresse</h2>
          <div className="input-row">
            <input
              placeholder="Straße"
              value={startAddress.strasse}
              onChange={(e) => setStartAddress({ ...startAddress, strasse: e.target.value })}
            />
            <input
              placeholder="PLZ"
              value={startAddress.plz}
              onChange={(e) => setStartAddress({ ...startAddress, plz: e.target.value })}
              style={{ width: '90px' }}
            />
            <input
              placeholder="Ort"
              value={startAddress.ort}
              onChange={(e) => setStartAddress({ ...startAddress, ort: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </section>

        {/* Excel Upload */}
        <section className="card">
          <h2>Adressen hochladen</h2>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          {addresses.length > 0 && (
            <p className="success">✓ {addresses.length} Adressen geladen</p>
          )}
        </section>

        {/* Berechnen */}
        <button
          className="btn-primary"
          onClick={handleCalculate}
          disabled={loading}
        >
          {loading ? 'Berechne Route...' : 'Tour planen'}
        </button>

        {error && <p className="error">{error}</p>}

        {/* Ergebnis */}
        {route && (
          <section className="card result">
            <h2>Deine optimierte Tour</h2>
            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">{(route.distance / 1000).toFixed(1)}</span>
                <span className="stat-label">km</span>
              </div>
              <div className="stat">
                <span className="stat-value">{Math.round(route.duration / 60)}</span>
                <span className="stat-label">Minuten</span>
              </div>
              <div className="stat">
                <span className="stat-value">{addresses.length}</span>
                <span className="stat-label">Lieferungen</span>
              </div>
            </div>

            {/* Karte */}
            {showMap && (
              <div className="map-container">
                <MapContainer
                  ref={mapRef}
                  center={[route.points[0].lat, route.points[0].lng]}
                  zoom={12}
                  style={{ height: '400px', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {route.points.map((point, i) => (
                    <Marker key={i} position={[point.lat, point.lng]}>
                      <Popup>{point.address}</Popup>
                    </Marker>
                  ))}
                  <Polyline
                    positions={route.points.map((p) => [p.lat, p.lng])}
                    color="#2563eb"
                    weight={4}
                  />
                </MapContainer>
              </div>
            )}

            {/* Reihenfolge */}
            <details>
              <summary>Reihenfolge anzeigen</summary>
              <ol>
                <li><strong>Start:</strong> {startAddress.strasse}, {startAddress.plz} {startAddress.ort}</li>
                {route.order.map((i) => (
                  <li key={i}>{addresses[i - 1]?.strasse}, {addresses[i - 1]?.plz} {addresses[i - 1]?.ort}</li>
                ))}
              </ol>
            </details>
          </section>
        )}

        {/* Statistiken */}
        <section className="card stats">
          <h2>Deine Statistiken</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-big">{stats.totalDeliveries}</span>
              <span className="stat-small">Gesamte Lieferungen</span>
            </div>
            <div className="stat-card">
              <span className="stat-big">{stats.totalKm.toFixed(1)}</span>
              <span className="stat-small">Kilometer gesamt</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>RouteFlow — Optimiere deine Lieferfahrten</p>
      </footer>
    </div>
  )
}

export default App
