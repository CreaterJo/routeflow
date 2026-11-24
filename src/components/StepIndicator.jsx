export default function StepIndicator({ current, total: _total, labels }) {
  return (
    <div className="step-indicator" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
      {labels.map((label, index) => {
        const stepNum = index + 1
        const isActive = stepNum === current
        const isCompleted = stepNum < current
        return (
          <div
            key={index}
            style={{
              fontWeight: isActive ? 'var(--font-bold)' : 'var(--font-normal)',
              color: isActive ? 'var(--color-primary)' : isCompleted ? 'var(--color-text)' : 'var(--color-text-muted)',
              textDecoration: isActive ? 'underline' : 'none',
              textUnderlineOffset: '6px',
              textDecorationThickness: '2px',
              transition: 'all var(--transition-base)'
            }}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}
