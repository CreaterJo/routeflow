/**
 * Excel-Parser — liest beide bekannte Excel-Formate und normalisiert sie.
 *
 * Variante A: Postleitzahl (PLZ+Ort kombiniert), Adresse, [Zahl]
 * Variante B: Postleitzahl, Ort, Straße und Hausnummer
 */

// ==========================================================================
// Geocaching (localStorage + in-memory, 30 Tage TTL)
// ==========================================================================

const GEOCACHE_KEY = 'routeflow_geocache'
const GEOCACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
let _geocache = new Map()

function loadCache() {
  try {
    const raw = localStorage.getItem(GEOCACHE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      Object.entries(data).forEach(([k, v]) => _geocache.set(k, { ...v, ts: v.ts }))
    }
  } catch { /* ignorieren */ }
}
function saveCache() {
  try {
    const data = Object.fromEntries(_geocache)
    localStorage.setItem(GEOCACHE_KEY, JSON.stringify(data))
  } catch { /* ignorieren */ }
}
function getFromCache(key) {
  const entry = _geocache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > GEOCACHE_TTL_MS) {
    _geocache.delete(key)
    return null
  }
  return entry.coords
}
function setInCache(key, coords) {
  _geocache.set(key, { coords, ts: Date.now() })
  saveCache()
}
loadCache() // beim Modul-Import einmal laden

function _cacheKey(strasse, plz, ort) {
  return `${(strasse || '').trim().toLowerCase()}|${(plz || '').trim()}|${(ort || '').trim().toLowerCase()}`
}

// ==========================================================================
// Excel-Parser
// ==========================================================================

/**
 * @param {File} file
 * @returns {Promise<Array<{plz: string, ort: string, strasse: string, lat?: number, lng?: number}>>}
 */
export async function parseExcel(file) {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  if (rows.length < 2) {
    throw new Error('Excel-Datei ist leer oder hat keine Adressen.')
  }

  const header = rows[0].map((h) => String(h || '').trim().toLowerCase())

  // Variante B erkennen: Spalten "postleitzahl", "ort", "strasse..."
  const hasPlzCol = header.some((h) => h.includes('postleitzahl') || h === 'plz')
  const hasOrtCol = header.some((h) => h.includes('ort'))
  const hasStrasseCol = header.some((h) => h.includes('strasse') || h.includes('str'))

  if (hasPlzCol && hasOrtCol && hasStrasseCol) {
    return parseVariantB(rows, header)
  }

  // Variante A: PLZ+Ort in einer Spalte, Adresse in der nächsten
  if (hasPlzCol && !hasOrtCol) {
    return parseVariantA(rows, header)
  }

  throw new Error('Unbekanntes Excel-Format. Erwarte Variante A oder B.')
}

function parseVariantB(rows, header) {
  const plzIdx = header.findIndex((h) => h.includes('postleitzahl') || h === 'plz')
  const ortIdx = header.findIndex((h) => h.includes('ort'))
  const strasseIdx = header.findIndex((h) => h.includes('strasse') || h.includes('str'))

  const addresses = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    const plz = String(row[plzIdx] || '').trim()
    const ort = String(row[ortIdx] || '').trim()
    const strasse = String(row[strasseIdx] || '').trim()
    if (!plz && !ort && !strasse) continue
    addresses.push({ plz, ort, strasse })
  }
  return addresses
}

function parseVariantA(rows, header) {
  const plzIdx = header.findIndex((h) => h.includes('postleitzahl') || h === 'plz')
  const adresseIdx = header.findIndex((h) => h.includes('adresse'))

  const addresses = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    const combined = String(row[plzIdx] || '').trim()
    const strasse = String(row[adresseIdx] || '').trim()
    if (!combined && !strasse) continue

    // PLZ+Ort kombinieren → "91325 Adelsdorf" → plz="91325", ort="Adelsdorf"
    const match = combined.match(/^(\d{5})\s+(.+)$/)
    const plz = match ? match[1] : ''
    const ort = match ? match[2].trim() : combined
    addresses.push({ plz, ort, strasse })
  }
  return addresses
}

// ==========================================================================
// Multi-Provider Geocoding
// ==========================================================================

/**
 * Versucht Geocoding über mehrere Provider in Reihe.
 * 1. Nominatim (OSM) – mit User-Agent
 * 2. Photon (Komoot) – Fallback
 * 3. Nominatim mit umgekehrter Reihenfolge als letzte Option
 *
 * @param {string} strasse
 * @param {string} plz
 * @param {string} ort
 * @returns {Promise<{lat: number, lng: number}>}
 * @throws {Error} wenn keine Adresse gefunden wird
 */
async function geocodeAddress(strasse, plz, ort, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
    }

    const normStrasse = strasse.replace(/\bstr\.?\b/gi, 'straße')
    const altStrasse = strasse.replace(/ß/gi, 'ss').replace(/\bstrasse\b/gi, 'str.')
    const streetOnly = strasse.replace(/\d+[a-z]?\s*$/, '').trim()
    const normStreetOnly = normStrasse.replace(/\d+[a-z]?\s*$/, '').trim()

    const fetchWithTimeout = async (url, options = {}, timeoutMs = 6000) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, { ...options, signal: controller.signal })
        clearTimeout(timer)
        return res
      } catch (err) {
        clearTimeout(timer)
        throw err
      }
    }

    const queries = [
      () => {
        const q = `${strasse}, ${plz} ${ort}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => {
          if (r.status === 429) throw new Error('RATE_LIMIT')
          if (r.status >= 500) throw new Error('SERVER_ERROR')
          return r.json().then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim' }))
        })
      },
      () => {
        const q = `${normStrasse}, ${plz} ${ort}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => {
          if (r.status === 429) throw new Error('RATE_LIMIT')
          return r.json().then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim-norm' }))
        })
      },
      () => {
        const q = `${streetOnly}, ${plz} ${ort}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => {
          if (r.status === 429) throw new Error('RATE_LIMIT')
          return r.json().then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim-no-hn' }))
        })
      },
      () => {
        const q = `${normStreetOnly}, ${plz} ${ort}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => {
          if (r.status === 429) throw new Error('RATE_LIMIT')
          return r.json().then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim-norm-no-hn' }))
        })
      },
      () => {
        const q = `${altStrasse}, ${plz} ${ort}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => {
          if (r.status === 429) throw new Error('RATE_LIMIT')
          return r.json().then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim-alt-street' }))
        })
      },
      () => {
        const q = `${strasse} ${plz} ${ort}`
        return fetchWithTimeout(`/api/photon/?q=${encodeURIComponent(q)}&limit=1`).then(r => {
          if (r.status >= 500) throw new Error('SERVER_ERROR')
          return r.json().then(data => {
            const coords = data.features?.[0]?.geometry?.coordinates
            if (!coords) throw new Error('NO_RESULT')
            return { lat: coords[1], lng: coords[0], source: 'photon' }
          })
        })
      },
      () => {
        const q = `${normStrasse} ${plz} ${ort}`
        return fetchWithTimeout(`/api/photon/?q=${encodeURIComponent(q)}&limit=1`).then(r => {
          if (r.status >= 500) throw new Error('SERVER_ERROR')
          return r.json().then(data => {
            const coords = data.features?.[0]?.geometry?.coordinates
            if (!coords) throw new Error('NO_RESULT')
            return { lat: coords[1], lng: coords[0], source: 'photon-norm' }
          })
        })
      },
      () => {
        const q = `${plz} ${ort}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => r.json()).then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim-plz-ort' }))
      },
      () => {
        const q = `${plz} ${ort} ${strasse}, Germany`
        return fetchWithTimeout(`/api/nominatim/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
          headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
        }).then(r => r.json()).then(data => ({ data, lat: parseFloat(data?.[0]?.lat), lng: parseFloat(data?.[0]?.lon), source: 'nominatim-alt' }))
      }
    ]

    for (const queryFn of queries) {
      try {
        const result = await queryFn()
        if (result.lat && result.lng && !isNaN(result.lat) && !isNaN(result.lng)) {
          return { lat: result.lat, lng: result.lng }
        }
      } catch (err) {
        if (err.message === 'RATE_LIMIT' && attempt < retries) {
          break
        }
        if (err.message === 'RATE_LIMIT') throw err
      }
    }
  }
  throw new Error(`Adresse nicht gefunden: ${strasse}, ${plz} ${ort}`)
}

/**
 * Geocodiert eine Adresse via Multi-Provider mit Caching.
 * Bleibt abwärtskompatibel zur alten API.
 *
 * @param {string} strasse
 * @param {string} plz
 * @param {string} ort
 * @returns {Promise<{lat: number, lng: number}>}
 */
export async function geocode(strasse, plz, ort) {
  const key = _cacheKey(strasse, plz, ort)
  const cached = getFromCache(key)
  if (cached) return cached

  const coords = await geocodeAddress(strasse, plz, ort)
  setInCache(key, coords)
  return coords
}

/**
 * Geocodiert viele Adressen parallel (Promise.allSettled).
 * Keine Adresse hält die andere auf – teilweise Treffer werden zurückgegeben.
 *
 * @param {Array<{plz: string, ort: string, strasse: string}>} addresses
 * @param {object} [options]
 * @param {number} [options.concurrency=5]
 * @param {Function|null} [options.onProgress]
 * @returns {Promise<Array<{...address, lat?: number, lng?: number, ok: boolean, error?: string}>>}
 */
export async function geocodeBatch(addresses, { onProgress = null, concurrency = 3 } = {}) {
  const n = addresses.length
  let doneCount = 0
  const results = []

  // Seriell in Batches mit Pause für Rate-Limiting (Nominatim: 1 req/s)
  const BATCH_SIZE = Math.min(concurrency, 3)
  const DELAY_MS = 1200 // 1.2s zwischen Batches

  for (let i = 0; i < n; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(addr =>
        geocodeAddress(addr.strasse, addr.plz, addr.ort)
          .then(coords => {
            doneCount++
            if (onProgress) onProgress(doneCount, n)
            return { ...addr, ...coords, ok: true, error: null }
          })
          .catch(err => {
            doneCount++
            if (onProgress) onProgress(doneCount, n)
            return { ...addr, ok: false, error: err.message, lat: null, lng: null }
          })
      )
    )
    results.push(...batchResults.map(r =>
      r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason }
    ))
    // Pause zwischen Batches für Rate-Limit
    if (i + BATCH_SIZE < n) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }
  return results
}

// ==========================================================================
// Suggestion APIs für Typeahead
// ==========================================================================

/**
 * Ortssuche nach PLZ — gibt die passenden Städte/Orte in DE zurück.
 *
 * @param {string} plz
 * @returns {Promise<Array<{plz: string, name: string, lat: number, lng: number}>>}
 */
export async function suggestOrt(plz) {
  if (!plz || plz.length < 2) return []
  const url = `/api/nominatim/search?format=json&q=${encodeURIComponent(plz)}&limit=10&addressdetails=1&countrycodes=de&viewbox=6.8,53.6,15.0,47.3&bounded=0`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
  })
  const data = await res.json()

  const seen = new Set()
  return data
    .filter(r => r.display_name && r.lat && r.lon)
    .map(r => ({
      plz: r.address?.postcode || plz,
      name: r.address?.village || r.address?.town || r.address?.city || r.address?.suburb || r.display_name.split(',')[0],
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon)
    }))
    .filter(r => r.name && !seen.has(r.name) && seen.add(r.name))
    .slice(0, 8)
}

/**
 * Straßensuche nach.query + PLZ + Ort.
 *
 * @param {string} query
 * @param {string} plz
 * @param {string} ort
 * @returns {Promise<Array<{name: string, display_name: string, lat: number, lng: number}>>}
 */
export async function suggestStreets(query, plz, ort) {
  if (!query || query.length < 1) return []
  const fullQ = `${query} ${plz} ${ort}`
  const url = `/api/nominatim/search?format=json&q=${encodeURIComponent(fullQ)}&limit=8&addressdetails=1&countrycodes=de&viewbox=6.8,53.6,15.0,47.3&bounded=0`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
  })
  const data = await res.json()

  const seen = new Set()
  return data
    .filter(r => r.display_name && r.lat && r.lon)
    .map(r => {
      const street = r.address?.road || r.display_name.split(',')[0]
      return { name: street.trim(), display_name: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
    })
    .filter(r => r.name && !seen.has(r.name) && seen.add(r.name))
    .slice(0, 10)
}

// ==========================================================================
// Route-Berechnung (OSRM)
// ==========================================================================

/**
 * Ruft die Route über OSRM.
 * Für ≤ 10 Punkte: einzelne Anfrage. Für > 10 Punkte: segmentierte Berechnung (Paar-für-Paar).
 * OSRM public API hat Limits — URL-Länge & Waypoint-Anzahl.
 *
 * @param {Array<{lat: number, lng: number}>} coords — Alle Wegpunkte inkl. Start/Ziel
 * @returns {Promise<{distance: number, duration: number, geometry: Array<[number, number]>, waypoints: Array<[number, number]>}>}
 */
export async function getRoute(coords) {
  const n = coords.length
  if (n < 2) throw new Error('Route benötigt mindestens 2 Koordinaten.')

  // Für viele Punkte: segmentierte Berechnung (vermeidet URL-Limit & Server-Overload)
  const USE_SEGMENTED = n > 10

  if (USE_SEGMENTED) {
    return await _segmentedRouteFallback(coords)
  }

  // Einfache Anfrage (alle Koordinaten sind automatisch Waypoints)
  const coordsStr = coords.map((c) => `${c.lng},${c.lat}`).join(';')
  const url = `/api/osrm/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`Routing-Server antwortete mit Status ${res.status}`)
    const data = await res.json()

    if (!data.routes?.length) {
      throw new Error('Keine Route gefunden. Die Koordinaten sind evtl. zu weit voneinander entfernt.')
    }

    const route = data.routes[0]
    const waypoints = (route.waypoints || []).map((wp) => [wp.location[0], wp.location[1]])

    return {
      distance: route.distance, // Meter
      duration: route.duration, // Sekunden
      geometry: route.geometry.coordinates, // [[lng, lat], ...]
      waypoints
    }
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Routing-Timeout: Server zu langsam — versuche es erneut.')
    }
    // Fallback auf segmentierte Berechnung bei jedem anderen Fehler
    return await _segmentedRouteFallback(coords)
  }
}

/**
 * Segmentierter Fallback: berechnet für je 2 benachbarte Punkte eine Route
 * und concat-Geometrien (Duplikate überspringen).
 */
async function _segmentedRouteFallback(coords) {
  const segments = []
  for (let i = 0; i < coords.length - 1; i++) {
    const pair = [coords[i], coords[i + 1]]
    const pairStr = pair.map((c) => `${c.lng},${c.lat}`).join(';')
    const url = `/api/osrm/route/v1/driving/${pairStr}?overview=full&geometries=geojson`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RouteFlow/2.0 (https://routeflow.app)' }
    })
    if (!res.ok) continue
    const data = await res.json()
    if (data.routes?.length) {
      const route = data.routes[0]
      // Fallback: gerade Linie falls OSRM keine Geometrie liefert
      const geom = route.geometry?.coordinates ?? [[pair[0].lng, pair[0].lat], [pair[1].lng, pair[1].lat]]
      segments.push({
        distance: route.distance ?? 0,
        duration: route.duration ?? 0,
        geometry: geom
      })
    }
  }
  if (segments.length === 0) throw new Error('Keine Teilstrecken gefunden.')

  // Geometrien zusammenführen, Duplikate entfernen
  const geometry = segments.reduce((acc, seg) => {
    const start = seg.geometry[0]
    if (acc.length > 0 && acc[acc.length - 1][0] === start[0] && acc[acc.length - 1][1] === start[1]) {
      acc.push(...seg.geometry.slice(1))
    } else {
      acc.push(...seg.geometry)
    }
    return acc
  }, [])

  const totalDistance = segments.reduce((s, seg) => s + seg.distance, 0)
  const totalDuration = segments.reduce((s, seg) => s + seg.duration, 0)

  return { distance: totalDistance, duration: totalDuration, geometry, waypoints: [] }
}

/**
 * Generiert einen Google Maps Directions-Link für die angegebenen Koordinaten.
 *
 * @param {Array<{lat: number, lng: number}>} coords
 * @param {string} [namePrefix='RouteFlow']
 * @returns {string} Google Maps URL
 */
export function generateGoogleMapsLink(coords, namePrefix = 'RouteFlow') {
  if (!coords || coords.length < 2) return ''
  const origin = coords[0]
  const destination = coords[coords.length - 1]
  const waypoints = coords.slice(1, -1)

  const parts = [
    `origin=${origin.lat},${origin.lng}`,
    `destination=${destination.lat},${destination.lng}`
  ]
  if (waypoints.length > 0) {
    const wpStr = waypoints.map((c) => `${c.lat},${c.lng}`).join('|')
    parts.push(`waypoints=${wpStr}`)
  }
  parts.push('travelmode=driving')

  if (namePrefix) {
    parts.push(`dir_action=navigate`)
  }

  return `https://www.google.com/maps/dir/?${parts.join('&')}`
}

// ==========================================================================
// TSP-Löser: Nearest-Neighbor + 2-Opt
// ==========================================================================

/**
 * Nearest-Neighbor Heuristik + 2-Opt Verbesserung mit geografischem Clustering.
 *
 * @param {Array<{lat: number, lng: number, address: string}>} points
 * @returns {Array<number>} — Indizes in der optimalen Reihenfolge, Startindex fixiert
 */
export function nearestNeighbor2Opt(points) {
  const n = points.length
  if (n <= 1) return [0]
  if (n === 2) return [0, 1]

  const CLUSTER_RADIUS = 5000
  const clusters = []
  const clusterAssignment = Array.from({ length: n }, () => -1)
  
  for (let i = 0; i < n; i++) {
    if (clusterAssignment[i] !== -1) continue
    
    const cluster = [i]
    clusterAssignment[i] = clusters.length
    
    for (let j = i + 1; j < n; j++) {
      if (clusterAssignment[j] !== -1) continue
      const dist = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
      if (dist <= CLUSTER_RADIUS) {
        cluster.push(j)
        clusterAssignment[j] = clusters.length
      }
    }
    
    clusters.push(cluster)
  }

  const clusterCenters = clusters.map(cluster => {
    const avgLat = cluster.reduce((sum, idx) => sum + points[idx].lat, 0) / cluster.length
    const avgLng = cluster.reduce((sum, idx) => sum + points[idx].lng, 0) / cluster.length
    return { lat: avgLat, lng: avgLng }
  })

  const startClusterIdx = clusterAssignment[0]
  const clusterVisited = Array.from({ length: clusters.length }, () => false)
  const clusterOrder = [startClusterIdx]
  clusterVisited[startClusterIdx] = true

  for (let i = 1; i < clusters.length; i++) {
    let bestIdx = -1
    let bestDist = Infinity
    const lastCenter = clusterCenters[clusterOrder[clusterOrder.length - 1]]

    for (let j = 0; j < clusters.length; j++) {
      if (clusterVisited[j]) continue
      const d = haversine(lastCenter.lat, lastCenter.lng, clusterCenters[j].lat, clusterCenters[j].lng)
      if (d < bestDist) {
        bestDist = d
        bestIdx = j
      }
    }

    if (bestIdx === -1) break
    clusterOrder.push(bestIdx)
    clusterVisited[bestIdx] = true
  }

  const tour = []
  
  for (const clusterIdx of clusterOrder) {
    const cluster = clusters[clusterIdx]
    
    if (cluster.length === 1) {
      tour.push(cluster[0])
      continue
    }

    const clusterVisitedLocal = Array.from({ length: cluster.length }, () => false)
    const clusterTour = []
    
    let startIdx = 0
    if (tour.length > 0) {
      let minDist = Infinity
      const lastPoint = points[tour[tour.length - 1]]
      cluster.forEach((idx, i) => {
        const d = haversine(lastPoint.lat, lastPoint.lng, points[idx].lat, points[idx].lng)
        if (d < minDist) {
          minDist = d
          startIdx = i
        }
      })
    } else {
      startIdx = cluster.findIndex(idx => idx === 0)
      if (startIdx === -1) startIdx = 0
    }
    
    clusterTour.push(cluster[startIdx])
    clusterVisitedLocal[startIdx] = true

    for (let i = 1; i < cluster.length; i++) {
      let bestIdx = -1
      let bestDist = Infinity
      const last = clusterTour[clusterTour.length - 1]

      for (let j = 0; j < cluster.length; j++) {
        if (clusterVisitedLocal[j]) continue
        const d = haversine(points[last].lat, points[last].lng, points[cluster[j]].lat, points[cluster[j]].lng)
        if (d < bestDist) {
          bestDist = d
          bestIdx = j
        }
      }

      if (bestIdx === -1) break
      clusterTour.push(cluster[bestIdx])
      clusterVisitedLocal[bestIdx] = true
    }

    tour.push(...clusterTour)
  }

  for (const clusterIdx of clusterOrder) {
    const cluster = clusters[clusterIdx]
    if (cluster.length <= 2) continue

    const clusterStartIdx = tour.findIndex(idx => cluster.includes(idx))
    const clusterEndIdx = clusterStartIdx + cluster.length - 1

    let improved = true
    while (improved) {
      improved = false
      for (let i = clusterStartIdx + 1; i < clusterEndIdx; i++) {
        for (let j = i + 1; j <= clusterEndIdx; j++) {
          const oldDist = edgeDist(points, tour, i - 1, i) + edgeDist(points, tour, j, Math.min(j + 1, tour.length - 1))
          const newDist = edgeDist(points, tour, i - 1, j) + edgeDist(points, tour, i, Math.min(j + 1, tour.length - 1))
          if (newDist < oldDist - 1e-9) {
            const segment = tour.slice(i, j + 1).reverse()
            tour.splice(i, segment.length, ...segment)
            improved = true
          }
        }
      }
    }
  }

  return tour
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371e3 // Erdradius in Metern
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

function edgeDist(points, tour, i, j) {
  const a = points[tour[i]]
  const b = points[tour[j]]
  return haversine(a.lat, a.lng, b.lat, b.lng)
}

// ==========================================================================
// Storage (localStorage Wrapper)
// ==========================================================================

export const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* Speicherkapazität überschritten */ }
  },
  remove(key) {
    localStorage.removeItem(key)
  }
}

