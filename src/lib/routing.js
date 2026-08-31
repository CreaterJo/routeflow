/**
 * Excel-Parser — liest beide bekannte Excel-Formate und normalisiert sie.
 *
 * Variante A: Postleitzahl (PLZ+Ort kombiniert), Adresse, [Zahl]
 * Variante B: Postleitzahl, Ort, Straße und Hausnummer
 */
import * as XLSX from 'xlsx'

/**
 * @param {File} file
 * @returns {Promise<Array<{plz: string, ort: string, strasse: string, lat?: number, lng?: number}>>}
 */
export async function parseExcel(file) {
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

/**
 * Geocodiert eine Adresse via Nominatim (OpenStreetMap, kostenlos, kein API-Key).
 * @param {string} strasse
 * @param {string} plz
 * @param {string} ort
 * @returns {Promise<{lat: number, lng: number}>}
 */
export async function geocode(strasse, plz, ort) {
  const query = `${strasse}, ${plz} ${ort}, Germany`
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RouteFlow/1.0' }
  })
  const data = await res.json()

  if (!data.length) {
    throw new Error(`Adresse nicht gefunden: ${query}`)
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  }
}

/**
 * Ruft die Routerouting via OSRM Public API.
 * @param {Array<{lat: number, lng: number}>} coords — Start + Zielkoordinaten
 * @returns {Promise<{distance: number, duration: number, geometry: Array<[number, number]>}>}
 */
export async function getRoute(coords) {
  // OSRM nimmt coords als "lng,lat" pairs
  const coordsStr = coords.map((c) => `${c.lng},${c.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`

  const res = await fetch(url)
  const data = await res.json()

  if (!data.routes?.length) {
    throw new Error('Keine Route gefunden')
  }

  const route = data.routes[0]
  return {
    distance: route.distance, // Meter
    duration: route.duration, // Sekunden
    geometry: route.geometry.coordinates // [[lng, lat], ...]
  }
}

/**
 * Nearest-Neighbor Heuristik + 2-Opt Verbesserung.
 * @param {Array<{lat: number, lng: number, address: string}>} points
 * @returns {Array<number>} — Indizes in der optimalen Reihenfolge, Startindex fixiert
 */
export function nearestNeighbor2Opt(points) {
  const n = points.length
  if (n <= 1) return [0]

  // Nearest Neighbor
  const visited = new Array(n).fill(false)
  const tour = [0]
  visited[0] = true

  for (let i = 1; i < n; i++) {
    let bestIdx = -1
    let bestDist = Infinity
    const last = tour[tour.length - 1]

    for (let j = 0; j < n; j++) {
      if (visited[j]) continue
      const d = haversine(points[last].lat, points[last].lng, points[j].lat, points[j].lng)
      if (d < bestDist) {
        bestDist = d
        bestIdx = j
      }
    }

    if (bestIdx === -1) break
    tour.push(bestIdx)
    visited[bestIdx] = true
  }

  // 2-Opt Verbesserung
  let improved = true
  while (improved) {
    improved = false
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const oldDist = edgeDist(points, tour, i - 1, i) + edgeDist(points, tour, j, (j + 1) % n)
        const newDist = edgeDist(points, tour, i - 1, j) + edgeDist(points, tour, i, (j + 1) % n)
        if (newDist < oldDist - 1e-9) {
          // Reverse segment
          const segment = tour.slice(i, j + 1).reverse()
          tour.splice(i, segment.length, ...segment)
          improved = true
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

/**
 * Speichert/Liest aus localStorage
 */
export const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  }
}
