import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { api } from '../lib/api.js'
import { NetworkIcon, BotIcon, ShieldIcon, TerminalIcon, FlaskIcon, CheckIcon } from '../components/icons.jsx'

const FEATURES = [
  { icon: NetworkIcon, title: 'Editor de topologias', text: 'Arraste equipamentos, ligue cabos reais e configure cada interface.' },
  { icon: TerminalIcon, title: 'CLI e terminal', text: 'Comandos de terminal e de rede com respostas calculadas a partir do laboratório.' },
  { icon: BotIcon, title: 'NETBOT', text: 'Assistente que analisa a topologia e explica cada falha em português.' },
  { icon: FlaskIcon, title: 'Laboratórios avaliados', text: 'Dez desafios guiados com avaliação automática de 0 a 20 valores.' },
]

export default function AuthPage() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [reset, setReset] = useState({ token: '', password: '' })
  const [resetMessage, setResetMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (tab === 'login') {
        await login(form.email.trim(), form.password)
      } else if (tab === 'register') {
        await register(form.name.trim(), form.email.trim(), form.password, form.role)
      } else {
        const data = await api.forgot(form.email.trim())
        setResetMessage(data.message)
        if (data.resetToken) setReset((previous) => ({ ...previous, token: data.resetToken }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function demoLogin(role) {
    setBusy(true)
    setError('')
    try {
      const email = role === 'teacher' ? 'professor@netlab.pt' : 'aluno@netlab.pt'
      await login(email, 'netlab123')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function applyReset(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api.reset(reset.token.trim(), reset.password)
      setResetMessage(data.message)
      setTab('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <section className="auth__brandside">
        <div className="auth__logo">
          <span className="brand__mark brand__mark--big" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="16" cy="6" r="3" /><circle cx="6" cy="24" r="3" /><circle cx="26" cy="24" r="3" />
              <path d="M16 9v6M14 14l-6 7M18 14l6 7" />
            </svg>
          </span>
          <div>
            <strong>NETLAB</strong>
            <span>ACADEMY</span>
          </div>
        </div>
        <h1>Simulador interativo de redes de computadores</h1>
        <p className="auth__lead">
          Construa topologias, configure IPs, VLANs e rotas, execute comandos e veja os pacotes a
          percorrer a sua rede — tudo no navegador.
        </p>
        <ul className="auth__features">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <li key={feature.title}>
                <span className="auth__feature-icon"><Icon width={18} height={18} /></span>
                <span>
                  <strong>{feature.title}</strong>
                  <small>{feature.text}</small>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="auth__note">
          Simulador educativo. Não executa software oficial de nenhum fabricante e os resultados
          são calculados a partir da topologia criada por si.
        </p>
      </section>

      <section className="auth__panel">
        <div className="auth__card">
          <div className="tabs tabs--auth" role="tablist">
            {[
              ['login', 'Entrar'],
              ['register', 'Criar conta'],
              ['recover', 'Recuperar'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`tabs__tab${tab === key ? ' tabs__tab--active' : ''}`}
                onClick={() => {
                  setTab(key)
                  setError('')
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab !== 'recover' ? (
            <form onSubmit={submit} className="auth__form">
              {tab === 'register' && (
                <>
                  <label className="field">
                    <span className="field__label">Nome</span>
                    <input className="field__input" value={form.name} onChange={set('name')} placeholder="O seu nome" required />
                  </label>
                  <label className="field">
                    <span className="field__label">Tipo de conta</span>
                    <select className="field__input" value={form.role} onChange={set('role')}>
                      <option value="student">Estudante</option>
                      <option value="teacher">Professor / administrador</option>
                    </select>
                  </label>
                </>
              )}
              <label className="field">
                <span className="field__label">E-mail</span>
                <input className="field__input" type="email" value={form.email} onChange={set('email')} placeholder="nome@escola.pt" required autoComplete="email" />
              </label>
              <label className="field">
                <span className="field__label">Palavra-passe</span>
                <input
                  className="field__input"
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder={tab === 'register' ? 'Mínimo 8 caracteres' : 'A sua palavra-passe'}
                  required
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                {busy ? 'A processar…' : tab === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={() => demoLogin('student')} disabled={busy}>
                Entrar com a conta de estudante de demonstração
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={() => demoLogin('teacher')} disabled={busy}>
                Entrar com a conta de professor de demonstração
              </button>
              <p className="muted small">
                Contas de demonstração: aluno@netlab.pt ou professor@netlab.pt · palavra-passe netlab123
              </p>
            </form>
          ) : (
            <div className="auth__form">
              <form onSubmit={submit}>
                <label className="field">
                  <span className="field__label">E-mail da conta</span>
                  <input className="field__input" type="email" value={form.email} onChange={set('email')} placeholder="nome@escola.pt" required />
                </label>
                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? 'A criar pedido…' : 'Pedir recuperação'}
                </button>
              </form>
              {resetMessage && <p className="notice">{resetMessage}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <form onSubmit={applyReset} className="auth__reset">
                <label className="field">
                  <span className="field__label">Código de recuperação</span>
                  <input className="field__input" value={reset.token} onChange={(event) => setReset((p) => ({ ...p, token: event.target.value }))} placeholder="Código recebido" />
                </label>
                <label className="field">
                  <span className="field__label">Nova palavra-passe</span>
                  <input className="field__input" type="password" value={reset.password} onChange={(event) => setReset((p) => ({ ...p, password: event.target.value }))} placeholder="Mínimo 8 caracteres" />
                </label>
                <button type="submit" className="btn btn--block" disabled={busy}>
                  Definir nova palavra-passe
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="auth__legal">
          <ShieldIcon width={15} height={15} /> As palavras-passe são guardadas com derivação de
          chave (scrypt) e nunca em texto simples.
        </p>
      </section>
    </div>
  )
}
