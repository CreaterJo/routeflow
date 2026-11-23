import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2 } from 'lucide-react'
import { suggestOrt, suggestStreets } from '../lib/routing'

/**
 * Intelligenter Adress-Input mit PLZ → Ort → Straße Typeahead.
 * @param {object} props
 * @param {object} props.value  { plz, ort, strasse }
 * @param {function} props.onChange  ({ plz, ort, strasse }) => void
 * @param {string} [props.error]  Fehlermeldung
 * @param {string} [props.label]  Label-Text
 */
export default function AddressInput({ value = { plz: '', ort: '', strasse: '' }, onChange, error, label }) {
  const [ortSuggestions, setOrtSuggestions] = useState([])
  const [streetSuggestions, setStreetSuggestions] = useState([])
  const [showOrtSuggestions, setShowOrtSuggestions] = useState(false)
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streetLoading, setStreetLoading] = useState(false)
  const ortTimer = useRef(null)
  const streetTimer = useRef(null)
  const ortRef = useRef(null)
  const streetRef = useRef(null)

  // Klick außerhalb schließt Dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (ortRef.current && !ortRef.current.contains(e.target)) setShowOrtSuggestions(false)
      if (streetRef.current && !streetRef.current.contains(e.target)) setShowStreetSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val })
    // Reset abhängige Felder
    if (field === 'plz') {
      onChange({ ...value, plz: val, ort: '', strasse: '' })
      setOrtSuggestions([])
      setStreetSuggestions([])
    }
    if (field === 'ort') {
      onChange({ ...value, ort: val, strasse: '' })
      setStreetSuggestions([])
    }
  }

  // PLZ → Ortschaftssuche (debounced)
  const handlePlzChange = (val) => {
    handleChange('plz', val)
    clearTimeout(ortTimer.current)
    if (!val || val.length < 2) { setOrtSuggestions([]); return }
    setLoading(true)
    ortTimer.current = setTimeout(() => {
      suggestOrt(val)
        .then(s => setOrtSuggestions(s))
        .catch(() => setOrtSuggestions([]))
        .finally(() => setLoading(false))
    }, 400)
  }

  // Ort auswählen
  const selectOrt = (s) => {
    handleChange('ort', s.name)
    handleChange('plz', s.plz)
    setShowOrtSuggestions(false)
    ortRef.current?.focus()
  }

  // Straße typeahead (debounced)
  const handleStreetChange = (val) => {
    handleChange('strasse', val)
    clearTimeout(streetTimer.current)
    if (!val || val.length < 2 || !value.plz || !value.ort) { setStreetSuggestions([]); return }
    setStreetLoading(true)
    streetTimer.current = setTimeout(() => {
      suggestStreets(val, value.plz, value.ort)
        .then(s => setStreetSuggestions(s))
        .catch(() => setStreetSuggestions([]))
        .finally(() => setStreetLoading(false))
    }, 350)
  }

  const selectStreet = (s) => {
    handleChange('strasse', s.name)
    setShowStreetSuggestions(false)
    streetRef.current?.focus()
  }

  return (
    <div ref={ortRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {label && <label className="input-label">{label}</label>}

      {/* PLZ */}
      <div style={{ position: 'relative' }}>
        <input
          className={`input${error ? ' input-error' : ''}`}
          type="text"
          placeholder="Postleitzahl (z.B. 91325)"
          value={value.plz}
          onChange={e => handlePlzChange(e.target.value)}
          maxLength={5}
          style={{ width: '120px', flex: 'none' }}
          aria-label="Postleitzahl"
        />
        {loading && (
          <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        )}
      </div>

      {/* Ort mit Vorschlag */}
      <div ref={ortRef} style={{ position: 'relative' }}>
        <input
          className={`input${error ? ' input-error' : ''}`}
          type="text"
          placeholder="Ort (wird automatisch vorgeschlagen)"
          value={value.ort}
          onChange={e => handleChange('ort', e.target.value)}
          onFocus={() => ortSuggestions.length > 0 && setShowOrtSuggestions(true)}
          aria-label="Ort"
          aria-autocomplete="list"
          aria-controls="ort-suggestions"
          aria-expanded={showOrtSuggestions}
        />
        <AnimatePresence>
          {showOrtSuggestions && ortSuggestions.length > 0 && (
            <motion.ul
              id="ort-suggestions"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10,
                listStyle: 'none',
                margin: 'var(--space-1) 0 0',
                padding: 'var(--space-2) 0',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {ortSuggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-var(--color-bg-alt) flex items-center gap-2"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 'var(--space-2) var(--space-4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--color-text)',
                      fontSize: 'var(--text-sm)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-alt)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => selectOrt(s)}
                  >
                    <Check size={14} color="var(--color-success)" />
                    <span><strong>{s.plz}</strong> {s.name}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Straße mit Vorschlag */}
      <div ref={streetRef} style={{ position: 'relative' }}>
        <input
          className={`input${error ? ' input-error' : ''}`}
          type="text"
          placeholder="Straße (z.B. Hauptstr…)"
          value={value.strasse}
          onChange={e => handleStreetChange(e.target.value)}
          onFocus={() => streetSuggestions.length > 0 && setShowStreetSuggestions(true)}
          aria-label="Straße"
          aria-autocomplete="list"
          aria-controls="street-suggestions"
          aria-expanded={showStreetSuggestions}
        />
        {streetLoading && (
          <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        )}
        <AnimatePresence>
          {showStreetSuggestions && streetSuggestions.length > 0 && (
            <motion.ul
              id="street-suggestions"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10,
                listStyle: 'none',
                margin: 'var(--space-1) 0 0',
                padding: 'var(--space-2) 0',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {streetSuggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 'var(--space-2) var(--space-4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--color-text)',
                      fontSize: 'var(--text-sm)',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-alt)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => selectStreet(s)}
                  >
                    <Check size={14} color="var(--color-success)" />
                    <span>{s.name}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <X size={12} /> {error}
        </span>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', margin: 0 }}>
        PLZ eingeben → Ort wird automatisch vorgeschlagen → Straße tippen für Vorschläge.
      </p>
    </div>
  )
}
