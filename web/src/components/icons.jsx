const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

const icon = (children) => function IconComponent(props) {
  return (
    <svg {...base} {...props}>
      {children}
    </svg>
  )
}

export const PcIcon = icon(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M9 20h6M12 16v4" /></>)
export const NotebookIcon = icon(<><rect x="5" y="4" width="14" height="10" rx="1.5" /><path d="M3 18h18" /></>)
export const ServerIcon = icon(<><rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" /><path d="M8 7h.01M8 17h.01" /></>)
export const PrinterIcon = icon(<><path d="M7 8V4h10v4" /><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M7 16h10v4H7z" /></>)
export const PhoneIcon = icon(<><rect x="9" y="5" width="9" height="6" rx="1.5" /><path d="M13.5 11v3H8a3 3 0 0 0-3 3v3" /><path d="M16 17h4" /></>)
export const SmartphoneIcon = icon(<><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>)
export const TabletIcon = icon(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M11 18h2" /></>)
export const CameraIcon = icon(<><path d="M3 8h4l2-2h6l2 2h4v11H3z" /><circle cx="12" cy="13" r="3.2" /></>)
export const IotIcon = icon(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>)
export const SwitchIcon = icon(<><rect x="2" y="8" width="20" height="8" rx="2" /><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" /></>)
export const HubIcon = icon(<><circle cx="12" cy="12" r="3" /><path d="M12 9V4M12 15v5M9 12H4M15 12h5" /></>)
export const RouterIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M7 12h10M14 9l3 3-3 3" /></>)
export const WifiRouterIcon = icon(<><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 17h.01M7.5 9a6 6 0 0 1 9 0M10 6.2a10 10 0 0 1 4 0" /></>)
export const ApIcon = icon(<><path d="M12 20v-6" /><circle cx="12" cy="11" r="2" /><path d="M7.5 6.5a6 6 0 0 1 9 0M5 4a10 10 0 0 1 14 0" /></>)
export const ModemIcon = icon(<><rect x="3" y="10" width="18" height="8" rx="2" /><path d="M7 14h2M17 14h.01M12 4v6" /></>)
export const FirewallIcon = icon(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12h6M12 9v6" /></>)
export const RepeaterIcon = icon(<><rect x="5" y="14" width="14" height="6" rx="2" /><path d="M12 11V6M9.5 8.5L12 6l2.5 2.5" /></>)
export const BridgeIcon = icon(<><path d="M3 7h7v10H3zM14 7h7v10h-7z" /><path d="M10 12h4" /></>)
export const ControllerIcon = icon(<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 12h3M8.5 10.5v3M15 11h.01M17.5 13h.01" /></>)

export const DEVICE_ICONS = {
  pc: PcIcon,
  notebook: NotebookIcon,
  server: ServerIcon,
  printer: PrinterIcon,
  ipphone: PhoneIcon,
  smartphone: SmartphoneIcon,
  tablet: TabletIcon,
  ipcam: CameraIcon,
  iot: IotIcon,
  switch: SwitchIcon,
  multilayer_switch: SwitchIcon,
  hub: HubIcon,
  router: RouterIcon,
  wireless_router: WifiRouterIcon,
  access_point: ApIcon,
  modem: ModemIcon,
  firewall: FirewallIcon,
  repeater: RepeaterIcon,
  bridge: BridgeIcon,
  controller: ControllerIcon,
}

export const CableIcon = icon(<><path d="M5 8V6a2 2 0 0 1 2-2h1M19 16v2a2 2 0 0 1-2 2h-1" /><path d="M5 8v4a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4" /></>)
export const CursorIcon = icon(<><path d="M5 3l6.5 16 2.2-6.3L20 10.5z" /></>)
export const PenIcon = icon(<><path d="M4 20l4-1 10-10-3-3L5 16z" /><path d="M14 6l3 3" /></>)
export const PlusIcon = icon(<><path d="M12 5v14M5 12h14" /></>)
export const TrashIcon = icon(<><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>)
export const EraserIcon = icon(<><path d="M4 16l7-7 6 6-5 5H7z" /><path d="M11 9l4-4a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-4 4" /><path d="M9 21h11" /></>)
export const PduIcon = icon(<><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M7 9h4M7 13h8" /><path d="M9 21h6M12 17v4" /><path d="M17 9l2 2-2 2" /></>)
export const MailIcon = icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 13l8.5-6.5" /></>)
export const MailOpenIcon = icon(<><path d="M3 10l9-6 9 6v9H3z" /><path d="M3 10l9 6 9-6" /><path d="M3 19l6.5-4.5M21 19l-6.5-4.5" /></>)
export const CopyIcon = icon(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>)
export const UndoIcon = icon(<><path d="M9 7L4 12l5 5" /><path d="M4 12h9a6 6 0 0 1 0 12" transform="translate(0,-6)" /></>)
export const RedoIcon = icon(<><path d="M15 7l5 5-5 5" /><path d="M20 12h-9a6 6 0 0 0 0 12" transform="translate(0,-6)" /></>)
export const ZoomInIcon = icon(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M11 8.5v5M8.5 11h5" /></>)
export const ZoomOutIcon = icon(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M8.5 11h5" /></>)
export const SaveIcon = icon(<><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 14h8v6H8z" /></>)
export const FolderIcon = icon(<><path d="M3 6h6l2 2h10v10H3z" /></>)
export const DownloadIcon = icon(<><path d="M12 4v10M8 11l4 4 4-4M5 19h14" /></>)
export const PlayIcon = icon(<><path d="M7 5l12 7-12 7z" /></>)
export const PauseIcon = icon(<><path d="M8 5v14M16 5v14" /></>)
export const StepIcon = icon(<><path d="M6 5l9 7-9 7zM18 5v14" /></>)
export const RestartIcon = icon(<><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v5h-5" /></>)
export const BoltIcon = icon(<><path d="M13 3L5 14h5l-1 7 8-11h-5z" /></>)
export const BookIcon = icon(<><path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" /></>)
export const FlaskIcon = icon(<><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M8 14h8" /></>)
export const ClipboardIcon = icon(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></>)
export const HelpIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7v.5M12 17h.01" /></>)
export const UserIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>)
export const LogoutIcon = icon(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>)
export const ShieldIcon = icon(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>)
export const TerminalIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>)
export const NetworkIcon = icon(<><circle cx="12" cy="4" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 6v5M12 11L5.8 17.3M12 11l6.2 6.3" /></>)
export const BotIcon = icon(<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 14h.01M15 14h.01M9 17h6" /><path d="M2 13h2M20 13h2" /></>)
export const CheckIcon = icon(<><path d="M5 12l5 5L20 7" /></>)
export const CloseIcon = icon(<><path d="M6 6l12 12M18 6L6 18" /></>)
export const ChevronIcon = icon(<><path d="M9 6l6 6-6 6" /></>)
export const ExpandIcon = icon(<><path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" /></>)
export const CollapseIcon = icon(<><path d="M9 4v5H4M15 20v-5h5M14 10l6-6M10 14l-6 6" /></>)
export const LayersIcon = icon(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>)
export const MenuIcon = icon(<><path d="M4 7h16M4 12h16M4 17h16" /></>)
export const GridIcon = icon(<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>)
export const LayoutIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10" /></>)
export const RocketIcon = icon(<><path d="M5 15l-2 6 6-2 8-8a5 5 0 0 0-4-4z" /><path d="M14 7l3 3" /></>)
export const ClockIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const StarIcon = icon(<><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></>)
export const SendIcon = icon(<><path d="M4 12l16-8-6 16-3-6z" /></>)
