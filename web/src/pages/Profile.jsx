import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { PageHeader, ProgressBar, Spinner, Toast, formatMinutes } from '../components/ui.jsx'
import { StarIcon, UserIcon } from '../components/icons.jsx'

export default function Profile() {
  const { user, refresh } = useAuth()
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState({ name: user?.name ?? '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.dashboard().then((data) => setStats(data.stats)).catch(() => {})
  }, [])

  async function save(event) {
    event.preventDefault()
    setError('')
    if (form.password && form.password !== form.confirm) {
      setError('As palavras-passe não coincidem.')
      return
    }
    if (form.password && form.password.length < 8) {
      setError('A palavra-passe deve ter pelo menos 8 caracteres.')
      return
    }
    setBusy(true)
    try {
      await api.updateProfile({ name: form.name.trim(), password: form.password || undefined })
      await refresh()
      setForm((previous) => ({ ...previous, password: '', confirm: '' }))
      setToast({ message: 'Perfil atualizado.', tone: 'ok' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Conta"
        title="Perfil e progresso"
        description="Os seus dados, nível e histórico de aprendizagem."
      />

      <div className="profilegrid">
        <section className="card profilecard">
          <span className="profilecard__avatar"><UserIcon width={26} height={26} /></span>
          <h2>{user?.name}</h2>
          <p className="muted">{user?.email}</p>
          <p className="tag tag--ok">{user?.role === 'teacher' ? 'Professor / administrador' : 'Estudante'}</p>
          <div className="levelbox">
            <p><StarIcon width={16} height={16} /> Nível {stats?.level ?? user?.level ?? 1}</p>
            <ProgressBar value={Math.min(100, ((stats?.xp ?? 0) % 400) / 4)} label="Progresso para o próximo nível" />
            <p className="small muted">{stats?.xp ?? 0} XP · {formatMinutes(stats?.minutesLearning ?? 0)} de aprendizagem</p>
          </div>
          <ul className="metrics">
            <li><span>Laboratórios</span><strong>{stats?.projects ?? 0}</strong></li>
            <li><span>Exercícios concluídos</span><strong>{stats?.exercisesDone ?? 0}</strong></li>
            <li><span>Progresso geral</span><strong>{stats?.progress ?? 0}%</strong></li>
            <li><span>Média nas avaliações</span><strong>{stats?.averageScore || '—'}</strong></li>
          </ul>
        </section>

        <section className="card">
          <h2>Dados da conta</h2>
          <form onSubmit={save} className="stack">
            <label className="field">
              <span className="field__label">Nome</span>
              <input
                className="field__input"
                value={form.name}
                onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span className="field__label">E-mail</span>
              <input className="field__input" value={user?.email ?? ''} readOnly disabled />
            </label>
            <label className="field">
              <span className="field__label">Nova palavra-passe (opcional)</span>
              <input
                className="field__input"
                type="password"
                value={form.password}
                onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                placeholder="Deixe vazio para manter"
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              <span className="field__label">Confirmar palavra-passe</span>
              <input
                className="field__input"
                type="password"
                value={form.confirm}
                onChange={(event) => setForm((previous) => ({ ...previous, confirm: event.target.value }))}
                autoComplete="new-password"
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'A guardar…' : 'Guardar alterações'}
            </button>
          </form>
        </section>
      </div>

      {!stats && <Spinner label="A carregar progresso…" />}
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
