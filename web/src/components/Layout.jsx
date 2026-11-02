import { useEffect, useState } from 'react'
import { Link, useRouter } from '../lib/router.jsx'
import {
  BookIcon,
  ClipboardIcon,
  FlaskIcon,
  HelpIcon,
  LayersIcon,
  LayoutIcon,
  LogoutIcon,
  MenuIcon,
  NetworkIcon,
  CloseIcon,
  ShieldIcon,
  FolderIcon,
  UserIcon,
} from './icons.jsx'

const NAV = [
  { to: '/', label: 'Painel', icon: LayoutIcon, match: (path) => path === '/' },
  { to: '/simulador', label: 'Simulador', icon: NetworkIcon, match: (path) => path.startsWith('/simulador') },
  { to: '/projetos', label: 'Projetos', icon: FolderIcon, match: (path) => path.startsWith('/projetos') },
  { to: '/cursos', label: 'Cursos', icon: BookIcon, match: (path) => path.startsWith('/cursos') },
  { to: '/laboratorios', label: 'Exercícios', icon: FlaskIcon, match: (path) => path.startsWith('/laboratorios') },
  { to: '/avaliacoes', label: 'Avaliações', icon: ClipboardIcon, match: (path) => path.startsWith('/avaliacoes') },
  { to: '/desafio-osi', label: 'Desafio OSI', icon: LayersIcon, match: (path) => path.startsWith('/desafio-osi') },
  { to: '/ajuda', label: 'Ajuda', icon: HelpIcon, match: (path) => path.startsWith('/ajuda') },
]

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="NETLAB ACADEMY — início">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="16" cy="6" r="3" />
          <circle cx="6" cy="24" r="3" />
          <circle cx="26" cy="24" r="3" />
          <path d="M16 9v6M14 14l-6 7M18 14l6 7" />
        </svg>
      </span>
      <span className="brand__text">
        <strong>NETLAB</strong>
        <span>ACADEMY</span>
      </span>
    </Link>
  )
}

export default function Layout({ user, onLogout, children }) {
  const { path } = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [path])

  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <button
          type="button"
          className="icon-btn topbar__toggle"
          aria-expanded={open}
          aria-label="Abrir menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
        </button>

        <nav className={`nav${open ? ' nav--open' : ''}`} aria-label="Navegação principal">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav__link${item.match(path) ? ' nav__link--active' : ''}`}
              >
                <Icon width={17} height={17} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          {user?.role === 'teacher' && (
            <Link
              to="/professor"
              className={`nav__link${path.startsWith('/professor') ? ' nav__link--active' : ''}`}
            >
              <ShieldIcon width={17} height={17} />
              <span>Professor</span>
            </Link>
          )}
        </nav>

        <div className="topbar__user">
          <Link to="/perfil" className="userchip" title="Perfil">
            <span className="userchip__avatar" aria-hidden="true">
              {user?.name?.slice(0, 1).toUpperCase() ?? <UserIcon width={16} height={16} />}
            </span>
            <span className="userchip__meta">
              <strong>{user?.name?.split(' ')[0] ?? 'Conta'}</strong>
              <small>{user?.role === 'teacher' ? 'Professor' : `Nível ${user?.level ?? 1}`}</small>
            </span>
          </Link>
          <button type="button" className="icon-btn" onClick={onLogout} aria-label="Terminar sessão" title="Terminar sessão">
            <LogoutIcon width={18} height={18} />
          </button>
        </div>
      </header>

      <main className="main">{children}</main>

      <footer className="footer">
        <span>NETLAB ACADEMY · simulador educativo de redes de computadores</span>
        <span>Não executa sistemas operativos de equipamentos reais. Resultados calculados a partir da topologia criada.</span>
      </footer>
    </div>
  )
}
