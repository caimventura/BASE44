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

export function NotebookIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4" width="14" height="10" rx="1.5" />
      <path d="M3 18h18" />
    </svg>
  )
}

export function ServerIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01" />
    </svg>
  )
}

export function PhoneIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  )
}

export function PrinterIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 8V4h10v4" />
      <rect x="4" y="8" width="16" height="8" rx="2" />
      <path d="M7 16h10v4H7z" />
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

export function HubIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V4M12 15v5M9 12H4M15 12h5" />
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

export function WifiRouterIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 17h.01M7.5 9a6 6 0 0 1 9 0M10 6.2a10 10 0 0 1 4 0" />
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

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export const DEVICE_ICONS = {
  pc: PcIcon,
  notebook: NotebookIcon,
  server: ServerIcon,
  phone: PhoneIcon,
  printer: PrinterIcon,
  switch: SwitchIcon,
  hub: HubIcon,
  router: RouterIcon,
  router_wifi: WifiRouterIcon,
}
