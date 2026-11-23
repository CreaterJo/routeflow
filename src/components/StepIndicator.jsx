import { motion } from 'framer-motion'

export default function StepIndicator({ current, total, labels }) {
  return (
    <div className="step-indicator">
      <div className="step-dot-wrapper">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            className={`step-dot ${i < current ? 'completed' : i === current ? 'active' : ''}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: i === current ? 0 : 4 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="step-dot" />
          </motion.div>
        ))}
      </div>
      <div className="step-line-wrapper">
        <motion.div
          className="step-line"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          exit={{ width: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      {labels.map((label, index) => (
        <div key={index} className="step-label">{label}</div>
      ))}
    </div>
  )
}