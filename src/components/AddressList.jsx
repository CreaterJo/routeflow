import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * Liste geladener Adressen mit manueller Hinzufügen-Option.
 */
export default function AddressList({ addresses, onAdd, onRemove, error }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newAddr, setNewAddr] = useState({ plz: '', ort: '', strasse: '' })

  const handleAdd = () => {
    if (!newAddr.plz && !newAddr.strasse) return
    onAdd([{ ...newAddr }])
    setNewAddr({ plz: '', ort: '', strasse: '' })
    setShowAdd(false)
  }

  return (
    <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
          Adressen{' '}
          <span className="badge badge-secondary" style={{ marginLeft: 'var(--space-2)' }}>
            {addresses.length}
          </span>
        </h3>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} /> Hinzufügen
        </button>
      </div>

      {/* Manuelle Eingabe */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
              padding: 'var(--space-4)', background: 'var(--color-bg-alt)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div className="input-row">
                <input
                  className="input"
                  placeholder="PLZ"
                  value={newAddr.plz}
                  onChange={e => setNewAddr({ ...newAddr, plz: e.target.value })}
                  maxLength={5}
                  style={{ width: '100px' }}
                />
                <input
                  className="input"
                  placeholder="Ort"
                  value={newAddr.ort}
                  onChange={e => setNewAddr({ ...newAddr, ort: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  className="input"
                  placeholder="Straße"
                  value={newAddr.strasse}
                  onChange={e => setNewAddr({ ...newAddr, strasse: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowAdd(false)}>
                  Abbrechen
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={handleAdd}>
                  Hinzufügen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adresse-Liste */}
      {addresses.length === 0 && !showAdd ? (
        <p className="text-muted text-sm text-center" style={{ padding: 'var(--space-6) 0' }}>
          Noch keine Adressen. Lade eine Excel-Datei oder füge Adressen manuell hinzu.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '300px', overflowY: 'auto' }}>
          <AnimatePresence initial={false}>
            {addresses.map((addr, i) => (
              <motion.li
                key={i}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-xs)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)'
                }}
              >
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', flexShrink: 0
                }}>{i + 1}</span>

                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  {addr.strasse && <strong>{addr.strasse}</strong>}
                  {addr.plz && <span> {addr.plz}</span>}
                  {addr.ort && <span> {addr.ort}</span>}
                </span>

                {addr.ok === false ? (
                  <AlertCircle size={16} color="var(--color-error)" title={addr.error} />
                ) : addr.ok ? (
                  <CheckCircle2 size={16} color="var(--color-success)" />
                ) : null}

                <button
                  className="btn btn-ghost"
                  style={{ padding: 'var(--space-1)', color: 'var(--color-text-light)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => onRemove(i)}
                  aria-label="Adresse entfernen"
                  title="Entfernen"
                >
                  <Trash2 size={16} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {error && <p className="error" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>}
    </div>
  )
}
