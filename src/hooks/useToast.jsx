import { useState, useCallback, useRef } from 'react'

/**
 * Einfache Toast-Nachrichten für Benutzer-Feedback.
 * @returns {{ toast: (msg, { type? }) => void, toasts: Array }}
 */
export default function useToast() {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const toast = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toast, toasts, dismiss }
}

/**
 * Toast-Komponente (render-only).
 */
export function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontSize: 'var(--text-lg)' }}>
            {t.type === 'success' && '✅'}
            {t.type === 'error' && '❌'}
            {t.type === 'warning' && '⚠️'}
            {t.type === 'info' && 'ℹ️'}
          </span>
          <div className="toast-content">
            <div className="toast-message">{t.message}</div>
          </div>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Schließen">✕</button>
        </div>
      ))}
    </div>
  )
}
