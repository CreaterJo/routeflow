import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet Marker Icons (Standard-Lösung für Vite/React)
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

/**
 * Erzeugt einen kreisförmigen Waypoint-Marker als divIcon.
 * @param {number} number  - Stop-Nummer
 * @param {string} color   - Hintergrundfarbe
 * @param {boolean} isStart - Start-Marker (grösser, Pink)
 * @param {boolean} isEnd   - End-Marker (grösser, Grün)
 */
function makeWaypointIcon(number, color, isStart, isEnd) {
  const size = (isStart || isEnd) ? 40 : 28
  const fontSize = (isStart || isEnd) ? 15 : 12
  const iconHtml = `<div style="position:relative;width:${size}px;height:${size}px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize}px;font-family:'Montserrat',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid white;">${number}</div>
  </div>`
  return L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

/**
 * Interaktive Tourenkarte mit Hub-Marker, nummerierten Stecknadeln und OSRM-Routenlinie.
 * @param {object}  props
 * @param {Array}   props.points       [{ lat, lng, address, isStart? }]
 * @param {Array}   props.routeOrder   Index-Folge (1-basiert, start=0)
 * @param {number}  props.distance     Gesamtdistanz in Metern
 * @param {number}  props.duration     Gesamtdauer in Sekunden
 * @param {string}  props.googleMapsLink  URL zu Google Maps Directions
 * @param {Array}   props.routeGeometry [[lng, lat], ...]  OSRM-Polylinien-Geometrie
 */
export default function MapView({
  points,
  routeOrder = [],
  distance = 0,
  duration = 0,
  googleMapsLink = '',
  routeGeometry = null
}) {
  const mapRef = useRef(null)

  // Bounding-Box berechnen für Zoom-to-fit
  const bounds = useMemo(() => {
    if (!points?.length) return [[51.505, 9.933], 12]
    const lats = points.map(p => p.lat)
    const lngs = points.map(p => p.lng)
    const padding = 0.02
    return [
      [Math.min(...lats) - padding, Math.min(...lngs) - padding],
      [Math.max(...lats) + padding, Math.max(...lngs) + padding]
    ]
  }, [points])

  // Order anwenden: Punkte in Tour-Reihenfolge
  const orderedPoints = useMemo(() => {
    if (!points || points.length < 2) return points || []
    if (!routeOrder?.length) return points
    // points[0] ist Start (Hub), dann nach Order
    const order = routeOrder.map(i => i - 1) // 1-basiert → 0-basiert
    return [points[0], ...order.map(i => points[i + 1])]
  }, [points, routeOrder])

/**
 * Route-Geometrie vorbereiten: routeGeometry bevorzugen, Fallback auf orderedPoints
 */
  const routePositions = useMemo(() => {
    if (routeGeometry && routeGeometry.length > 1) {
      // routeGeometry ist [[lng, lat], ...] → leaflet braucht [lat, lng]
      return routeGeometry.map(([lng, lat]) => [lat, lng])
    }
    return orderedPoints.map(p => [p.lat, p.lng])
  }, [routeGeometry, orderedPoints])

  useEffect(() => {
    if (mapRef.current && orderedPoints.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [bounds, orderedPoints.length])

  if (!points || points.length === 0) return null

  const totalStops = points.length - 1
  const formattedDistance = (distance / 1000).toFixed(1)
  const formattedDuration = Math.round(duration / 60)
  const hasGoogleMapsLink = !!googleMapsLink

  return (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', marginTop: 'var(--space-4)' }}>
      {/* Info-Banner */}
      <div style={{
        display: 'flex', gap: 'var(--space-6)', padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--text-sm)'
      }}>
        <span>
          <strong style={{ color: 'var(--color-primary)' }}>{formattedDistance}</strong> km
        </span>
        <span>
          <strong style={{ color: 'var(--color-secondary)' }}>{formattedDuration}</strong> Min.
        </span>
        <span>
          <strong style={{ color: 'var(--color-text)' }}>{totalStops}</strong> Stopps
        </span>
      </div>

      <MapContainer
        ref={mapRef}
        center={[bounds[0][0] + (bounds[1][0] - bounds[0][0]) / 2, bounds[0][1] + (bounds[1][1] - bounds[0][1]) / 2]}
        zoom={12}
        style={{ height: '420px', width: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Echte OSRM-Routenlinie (durchgezogen) */}
        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            color="#f1416c"
            weight={5}
            opacity={0.9}
          />
        )}

        {/* Marker — Start, Mitte, Ende */}
        {orderedPoints.map((point, i) => {
          const isStart = i === 0
          const isEnd = i === orderedPoints.length - 1 && !isStart
          const color = isStart ? '#f1416c' : isEnd ? '#50cd89' : '#071437'
          const number = isStart ? 'H' : i
          const icon = makeWaypointIcon(number, color, isStart, isEnd)

          return (
            <Marker
              key={i}
              position={[point.lat, point.lng]}
              icon={icon}
              zIndexOffset={isStart ? 1000 : isEnd ? 800 : 500}
            >
              <Popup className="route-popup" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <div style={{ fontSize: 'var(--text-sm)', minWidth: '150px' }}>
                  {isStart ? (
                    <>
                      <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)', color: '#f1416c' }}>
                        Start (Hub)
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                        {point.address}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 'var(--font-semibold)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: color, color: 'white', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)'
                        }}>{i}</span>
                        {isEnd ? 'Ziel' : `Stop ${i}`}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>
                        {point.address}
                      </div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Google Maps Button + Legende */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderTop: 'none',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)'
      }}>
        {/* Legende */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f1416c', display: 'inline-block' }} /> Start
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#071437', display: 'inline-block' }} /> Stopp
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#50cd89', display: 'inline-block' }} /> Ziel
          </span>
          <span style={{ marginLeft: 'var(--space-2)' }}>Karte: OpenStreetMap</span>
        </div>

        {/* Google Maps Button */}
        {hasGoogleMapsLink ? (
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: 'var(--space-1) var(--space-3)',
              background: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 'var(--font-semibold)',
              fontSize: 'var(--text-xs)',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <span>📍</span> Route in Google Maps öffnen
          </a>
        ) : (
          <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Google Maps-Link wird berechnet …</span>
        )}
      </div>
    </div>
  )
}
