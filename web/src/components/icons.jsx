const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function PcIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  )
}

export function SwitchIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="9" width="20" height="6" rx="2" />
      <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
    </svg>
  )
}

export function RouterIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 12h10M14 9l3 3-3 3" />
    </svg>
  )
}

export function CableIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 8V6a2 2 0 0 1 2-2h1M19 16v2a2 2 0 0 1-2 2h-1" />
      <path d="M5 8v4a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4" />
    </svg>
  )
}

export function PingIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  )
}
