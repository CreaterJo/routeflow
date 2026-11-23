import { Component } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * Catch Block für Runtime-Fehler.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[RouteFlow] ErrorBoundary:', error, info)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg)', padding: 'var(--space-4)'
        }}>
          <div className="card" style={{ maxWidth: '420px', padding: 'var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <AlertCircle size={48} color="var(--color-error)" style={{ alignSelf: 'center' }} />
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Ups, etwas ist schiefgegangen</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>
            <button className="btn btn-primary" onClick={this.retry}>
              <RefreshCw size={16} /> Erneut versuchen
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
