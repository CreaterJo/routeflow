import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Sun } from 'lucide-react'

/**
 * Einmaliger Onboarding-Dialog: Name + Startadresse.
 * @param {object} props
 * @param {boolean} props.show  Modal anzeigen?
 * @param {object}  props.user  { name: string, startAddress: { plz, ort, strasse } }
 * @param {function} props.onSave  ({ name, startAddress }) => void
 */
export default function OnboardingModal({ show, user = { name: '', startAddress: { plz: '', ort: '', strasse: '' } }, onSave }) {
  const [name, setName] = useState(user.name)
  const [address, setAddress] = useState(user.startAddress)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = name.trim().length > 0 && address.plz.trim().length === 5 && address.ort.trim().length > 0 && address.strasse.trim().length > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      onSave({ name: name.trim(), startAddress: { ...address } })
    } catch {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--color-primary-lighter) 0%, var(--color-bg-alt) 100%)', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div className="modal-title" id="onboarding-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Leaf size={24} color="var(--color-secondary)" />
                  Willkommen bei RouteFlow!
                </div>
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Dein smarter Tourenplaner — einmal einrichten, immer dabei.
                </p>
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Feature-Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {[
                  { icon: MapPin, color: 'var(--color-primary)', title: 'Start & Ziel', desc: 'Hub + Adressen' },
                  { icon: Sun, color: 'var(--color-accent)', title: 'Optimiert', desc: 'Kürzeste Route' },
                  { icon: Leaf, color: 'var(--color-secondary)', title: 'Automatisch', desc: 'Caching & Vorschläge' }
                ].map(({ icon: Icon, color, title, desc }, i) => (
                  <div key={i} style={{
                    textAlign: 'center', padding: 'var(--space-3)',
                    background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <Icon size={24} color={color} style={{ marginBottom: 'var(--space-2)' }} />
                    <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{desc}</div>
                  </div>
                ))}
              </div>

              {/* Name */}
              <div>
                <label className="input-label">Wie heißt du?</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Dein Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={40}
                  autoFocus
                />
              </div>

              {/* Startadresse */}
              <div>
                <label className="input-label">Dein Startpunkt (Hub)</label>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="PLZ (z.B. 91325)"
                    value={address.plz}
                    onChange={e => setAddress({ ...address, plz: e.target.value })}
                    maxLength={5}
                    style={{ marginBottom: 'var(--space-2)' }}
                  />
                  <input
                    className="input"
                    type="text"
                    placeholder="Ort (z.B. Adelsdorf)"
                    value={address.ort}
                    onChange={e => setAddress({ ...address, ort: e.target.value })}
                    style={{ marginBottom: 'var(--space-2)' }}
                  />
                  <input
                    className="input"
                    type="text"
                    placeholder="Straße (z.B. Hauptstraße 1)"
                    value={address.strasse}
                    onChange={e => setAddress({ ...address, strasse: e.target.value })}
                  />
                </div>
                {error && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)' }}>{error}</span>}
              </div>
            </div>

            <div className="modal-footer" style={{ background: 'var(--color-bg-alt)' }}>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!canSave || saving}
                style={{ minWidth: '140px' }}
              >
                {saving ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >⏳</motion.span>
                ) : (
                  'Los geht\'s →'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
