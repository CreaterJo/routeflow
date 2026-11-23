import { useState, useCallback } from 'react'
import { geocodeBatch, geocode } from '../lib/routing'
import { storage } from '../lib/routing'

// ========== Keys ==========
const USER_KEY = 'routeflow_user'
const MODE_KEY = 'routeflow_mode'
const STATS_KEY = 'routeflow_stats'
const TOUR_KEY = 'routeflow_last_tour'

const TOTAL_STEPS = 4
const STEP_ADDRESSES = 2
const STEP_RESULT = 4

/**
 * Wizard-Logik-Hook für RouteFlow.
 * @returns {{ ... }}
 */
export default function useWizard({ toast }) {
  // Persistenz
  const [user, setUser] = useState(() => storage.get(USER_KEY) || null)
  const [mode, setMode] = useState(() => storage.get(MODE_KEY) || 'local')
  const [stats, setStats] = useState(() => storage.get(STATS_KEY) || { totalDeliveries: 0, totalKm: 0 })

  // Wizard-Status
  const [step, setStep] = useState(TOTAL_STEPS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Daten
  const [startAddress, setStartAddress] = useState(() =>
    user?.startAddress || { plz: '', ort: '', strasse: '' }
  )
  const [addresses, setAddresses] = useState([])
  const [route, setRoute] = useState(null)
  const [geocodeProgress, setGeocodeProgress] = useState(null)

  // ---- Actions ----

  const saveUser = useCallback((newUser) => {
    storage.set(USER_KEY, newUser)
    setUser(newUser)
    if (newUser.startAddress) {
      setStartAddress(newUser.startAddress)
    }
  }, [])

  const toggleMode = useCallback(() => {
    const newMode = mode === 'local' ? 'cloud' : 'local'
    setMode(newMode)
    storage.set(MODE_KEY, newMode)
    toast(newMode === 'cloud' ? 'Cloud-Modus aktiviert' : 'Lokaler Modus aktiviert', { type: 'info' })
  }, [mode, toast])

  const addAddresses = useCallback((newAddrs) => {
    setAddresses(prev => [...prev, ...newAddrs.map(a => ({ ...a, ok: null }))]
    )
  }, [])

  const removeAddress = useCallback((index) => {
    setAddresses(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearAddresses = useCallback(() => {
    setAddresses([])
    setRoute(null)
    setError(null)
  }, [])

  const calculateRoute = useCallback(async () => {
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

      // 2. Alle Lieferadressen parallel geocodieren
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
        toast(
          `${failed.length} Adresse(n) nicht gefunden: ${failed.map(f => f.strasse).slice(0, 3).join(', ')}${failed.length > 3 ? ' …' : ''}`,
          { type: 'warning' }
        )
      }

      const validResults = batchResults.filter(r => r.ok)
      if (validResults.length === 0) {
        throw new Error('Keine Adresse konnte geocodiert werden.')
      }

      // 3. Punkte zusammenbauen
      const locationPoints = [
        { ...startCoords, address: `${startAddress.strasse}, ${startAddress.plz} ${startAddress.ort}`, isStart: true }
      ]
      for (const r of validResults) {
        locationPoints.push({
          lat: r.lat, lng: r.lng,
          address: `${r.strasse}, ${r.plz} ${r.ort}`,
          isStart: false
        })
      }

      // 4. Route berechnen (TSP + OSRM)
      const { nearestNeighbor2Opt, getRoute } = await import('../lib/routing')
      const tourOrder = nearestNeighbor2Opt(locationPoints.slice(1))
      const orderedPoints = [locationPoints[0], ...tourOrder.map(i => locationPoints[i + 1])]

      const routeData = await getRoute(orderedPoints)

      setRoute({
        points: orderedPoints,
        distance: routeData.distance,
        duration: routeData.duration,
        order: tourOrder.map(i => i + 1),
        failedCount: failed.length
      })

      // 5. Statistiken updaten
      const newStats = {
        totalDeliveries: stats.totalDeliveries + validResults.length,
        totalKm: stats.totalKm + routeData.distance / 1000
      }
      setStats(newStats)
      storage.set(STATS_KEY, newStats)

      // 6. Letzte Tour speichern
      storage.set(TOUR_KEY, {
        startAddress,
        addresses: validResults,
        route
      })

      setStep(STEP_RESULT)
      toast(`Tour geplant! ${validResults.length} Stopps, ${(routeData.distance / 1000).toFixed(1)} km`, { type: 'success' })

    } catch (err) {
      setError(err.message)
      toast(err.message, { type: 'error' })
    } finally {
      setLoading(false)
      setGeocodeProgress(null)
    }
  }, [addresses, startAddress, stats, toast])

  const nextStep = useCallback(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), [])
  const prevStep = useCallback(() => setStep(s => Math.max(s - 1, 1)), [])
  const goToStep = useCallback((s) => setStep(s), [])

  const resetTour = useCallback(() => {
    setAddresses([])
    setRoute(null)
    setError(null)
    setGeocodeProgress(null)
    setStep(STEP_ADDRESSES)
  }, [])

  const resetAll = useCallback(() => {
    storage.remove(USER_KEY)
    setUser(null)
    setStartAddress({ plz: '', ort: '', strasse: '' })
    setAddresses([])
    setRoute(null)
    setError(null)
    setStep(TOTAL_STEPS)
  }, [])

  return {
    // State
    step, user, mode, stats, startAddress, addresses, route, loading, error, geocodeProgress,
    // Actions
    saveUser, toggleMode, addAddresses, removeAddress, clearAddresses, calculateRoute,
    nextStep, prevStep, goToStep, resetTour, resetAll, setError
  }
}
