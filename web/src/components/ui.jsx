import { useEffect } from 'react'
import { CloseIcon } from './icons.jsx'

export function ProgressBar({ value, label }) {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)))
  return (
    <div className="progress" role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progresso'}>
      <span className="progress__bar" style={{ width: `${safe}%` }} />
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page__head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page__desc">{description}</p>}
      </div>
      {actions && <div className="page__actions">{actions}</div>}
    </header>
  )
}

export function StatCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <article className={`stat${tone ? ` stat--${tone}` : ''}`}>
      {Icon && (
        <span className="stat__icon">
          <Icon width={20} height={20} />
        </span>
      )}
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {hint && <p className="stat__hint">{hint}</p>}
    </article>
  )
}

export function Badge({ children, tone = 'default' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function Empty({ title, description, action }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {description && <p className="empty__text">{description}</p>}
      {action}
    </div>
  )
}

export function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className={`modal__panel${wide ? ' modal__panel--wide' : ''}`}>
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <CloseIcon width={18} height={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Spinner({ label = 'A carregar…' }) {
  return (
    <div className="loading" role="status">
      <span className="loading__dot" />
      <span>{label}</span>
    </div>
  )
}

export function Toast({ message, tone = 'info', onClose }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => onClose?.(), 4200)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null
  return (
    <div className={`toast toast--${tone}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  )
}

export const formatMinutes = (minutes) => {
  const total = Math.max(0, Number(minutes) || 0)
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export const pct = (value) => `${Math.round(value || 0)}%`
