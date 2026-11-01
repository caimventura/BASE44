import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { PageHeader, Spinner, Toast } from '../components/ui.jsx'
import { ClipboardIcon, PlusIcon, ShieldIcon, TrashIcon } from '../components/icons.jsx'

const CHECK_OPTIONS = [
  { key: 'allConnected', label: 'Todos os equipamentos ligados', check: { type: 'allConnected', label: 'Tudo ligado', weight: 1 } },
  { key: 'allEndHaveIp', label: 'IPs configurados nos dispositivos finais', check: { type: 'allEndHaveIp', label: 'IPs configurados', weight: 2 } },
  { key: 'sameSubnetEnds', label: 'Todos na mesma sub-rede', check: { type: 'sameSubnetEnds', label: 'Mesma sub-rede', weight: 2 } },
  { key: 'pingAll', label: 'Comunicação entre todos (ping)', check: { type: 'pingAll', label: 'Comunicação por ping', weight: 3 } },
  { key: 'crossNetworkPing', label: 'Comunicação entre redes diferentes', check: { type: 'crossNetworkPing', label: 'Comunicação entre redes', weight: 4 } },
  { key: 'vlanCount', label: 'Pelo menos duas VLANs', check: { type: 'vlanCount', count: 2, label: 'Duas VLANs', weight: 2 } },
  { key: 'dhcp', label: 'Serviço DHCP ativo', check: { type: 'serviceEnabled', service: 'dhcp', label: 'DHCP ativo', weight: 3 } },
  { key: 'dns', label: 'Serviço DNS ativo', check: { type: 'serviceEnabled', service: 'dns', label: 'DNS ativo', weight: 2 } },
]

const buildStarter = (template) => {
  if (template === 'direct') {
    return {
      devices: [
        { name: 'PC0', type: 'pc', x: 30, y: 50 },
        { name: 'PC1', type: 'pc', x: 70, y: 50 },
      ],
      links: [{ a: 'PC0', b: 'PC1', cable: 'crossover' }],
    }
  }
  if (template === 'lan') {
    return {
      devices: [
        { name: 'SW0', type: 'switch', x: 50, y: 30 },
        { name: 'PC0', type: 'pc', x: 25, y: 65 },
        { name: 'PC1', type: 'pc', x: 50, y: 65 },
        { name: 'PC2', type: 'pc', x: 75, y: 65 },
      ],
      links: [
        { a: 'PC0', b: 'SW0' },
        { a: 'PC1', b: 'SW0' },
        { a: 'PC2', b: 'SW0' },
      ],
    }
  }
  return { devices: [], links: [] }
}

export default function Teacher() {
  const [tab, setTab] = useState('students')
  const [students, setStudents] = useState(null)
  const [submissions, setSubmissions] = useState(null)
  const [labs, setLabs] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    title: '',
    objective: '',
    brief: '',
    level: 1,
    points: 20,
    instructions: '',
    template: 'lan',
    checks: ['allConnected', 'allEndHaveIp', 'pingAll'],
  })

  const loadLabs = () => api.labs().then((data) => setLabs(data.labs)).catch((err) => setError(err.message))

  useEffect(() => {
    api.teacherStudents().then((data) => setStudents(data.students)).catch((err) => setError(err.message))
    api.teacherSubmissions().then((data) => setSubmissions(data.submissions)).catch(() => {})
    loadLabs()
  }, [])

  const toggleCheck = (key) =>
    setForm((previous) => ({
      ...previous,
      checks: previous.checks.includes(key)
        ? previous.checks.filter((entry) => entry !== key)
        : [...previous.checks, key],
    }))

  async function createLab(event) {
    event.preventDefault()
    setError('')
    if (form.checks.length === 0) {
      setError('Escolha pelo menos um critério de avaliação.')
      return
    }
    setBusy(true)
    try {
      await api.teacherCreateLab({
        title: form.title,
        objective: form.objective,
        brief: form.brief,
        level: Number(form.level),
        points: Number(form.points),
        instructions: form.instructions.split('\n').map((line) => line.trim()).filter(Boolean),
        starter: buildStarter(form.template),
        checks: CHECK_OPTIONS.filter((option) => form.checks.includes(option.key)).map((option) => option.check),
      })
      setToast({ message: 'Exercício publicado. Já aparece na lista de exercícios dos alunos.', tone: 'ok' })
      setForm((previous) => ({ ...previous, title: '', objective: '', brief: '', instructions: '' }))
      await loadLabs()
      setTab('labs')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deactivate(lab) {
    if (!window.confirm(`Desativar o exercício "${lab.title}"?`)) return
    try {
      await api.teacherDeleteLab(lab.id)
      await loadLabs()
      setToast({ message: 'Exercício desativado.', tone: 'warn' })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Área do professor"
        title="Gestão de turma"
        description="Acompanhe o progresso dos estudantes, consulte submissões e publique novos exercícios."
        actions={<span className="tag tag--ok"><ShieldIcon width={13} height={13} /> Acesso de professor</span>}
      />

      <div className="tabs tabs--page" role="tablist">
        {[
          ['students', 'Estudantes'],
          ['submissions', 'Submissões'],
          ['labs', 'Exercícios publicados'],
          ['create', 'Criar exercício'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tabs__tab${tab === key ? ' tabs__tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      {tab === 'students' && (
        <section className="card">
          <h2>Estudantes</h2>
          {!students ? (
            <Spinner label="A carregar estudantes…" />
          ) : students.length === 0 ? (
            <p className="muted">Ainda não existem contas de estudante.</p>
          ) : (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr><th>Nome</th><th>E-mail</th><th>Nível</th><th>Projetos</th><th>Exercícios</th><th>Média</th><th>Minutos</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td className="mono">{student.email}</td>
                      <td>{student.level}</td>
                      <td>{student.projects}</td>
                      <td>{student.labs_done}</td>
                      <td>{student.avgScore ? `${student.avgScore.toFixed(1)}/20` : '—'}</td>
                      <td>{student.minutes_learning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'submissions' && (
        <section className="card">
          <h2>Submissões recentes</h2>
          {!submissions ? (
            <Spinner label="A carregar submissões…" />
          ) : submissions.length === 0 ? (
            <p className="muted">Ainda não há submissões.</p>
          ) : (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr><th>Estudante</th><th>Exercício</th><th>Projeto</th><th>Nota</th><th>Data</th></tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>{submission.student_name}</td>
                      <td>{submission.lab_title}</td>
                      <td>{submission.project_name ?? '—'}</td>
                      <td>{Number(submission.score).toFixed(1)}/{submission.max_score}</td>
                      <td>{new Date(submission.created_at).toLocaleDateString('pt-PT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'labs' && (
        <section className="card">
          <h2>Exercícios publicados</h2>
          {!labs ? (
            <Spinner label="A carregar exercícios…" />
          ) : (
            <ul className="list">
              {labs.map((lab) => (
                <li key={lab.id} className="list__row">
                  <span>
                    <strong>{lab.title}</strong>
                    <small className="muted"> · Nível {lab.level} · {lab.points} valores</small>
                  </span>
                  <button type="button" className="btn btn--tiny btn--danger" onClick={() => deactivate(lab)}>
                    <TrashIcon width={13} height={13} /> Desativar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'create' && (
        <section className="card">
          <h2><PlusIcon width={18} height={18} /> Criar exercício</h2>
          <p className="muted">
            O exercício fica disponível para todos os estudantes, com topologia inicial e critérios
            avaliados no estado real do laboratório.
          </p>
          <form onSubmit={createLab} className="stack">
            <label className="field">
              <span className="field__label">Título</span>
              <input className="field__input" value={form.title} onChange={(event) => setForm((p) => ({ ...p, title: event.target.value }))} placeholder="Laboratório — rede da biblioteca" required />
            </label>
            <label className="field">
              <span className="field__label">Objetivo</span>
              <input className="field__input" value={form.objective} onChange={(event) => setForm((p) => ({ ...p, objective: event.target.value }))} placeholder="Ligar três computadores e configurar a mesma sub-rede" required />
            </label>
            <label className="field">
              <span className="field__label">Descrição breve</span>
              <input className="field__input" value={form.brief} onChange={(event) => setForm((p) => ({ ...p, brief: event.target.value }))} placeholder="Contexto do desafio" />
            </label>
            <div className="grid grid--3">
              <label className="field">
                <span className="field__label">Nível</span>
                <select className="field__input" value={form.level} onChange={(event) => setForm((p) => ({ ...p, level: event.target.value }))}>
                  {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Nível {level}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Valor máximo</span>
                <input className="field__input" type="number" min="1" max="20" value={form.points} onChange={(event) => setForm((p) => ({ ...p, points: event.target.value }))} />
              </label>
              <label className="field">
                <span className="field__label">Topologia inicial</span>
                <select className="field__input" value={form.template} onChange={(event) => setForm((p) => ({ ...p, template: event.target.value }))}>
                  <option value="lan">LAN com switch e 3 PCs</option>
                  <option value="direct">Dois PCs ligados diretamente</option>
                  <option value="empty">Área vazia</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span className="field__label">Instruções (uma por linha)</span>
              <textarea
                className="field__input field__input--area"
                rows={4}
                value={form.instructions}
                onChange={(event) => setForm((p) => ({ ...p, instructions: event.target.value }))}
                placeholder={'Configure os IPs na mesma sub-rede\nTeste com ping\nVerifique o exercício'}
              />
            </label>
            <fieldset className="field">
              <legend className="field__label">Critérios de avaliação</legend>
              <div className="checkgrid">
                {CHECK_OPTIONS.map((option) => (
                  <label key={option.key} className="checkbox">
                    <input
                      type="checkbox"
                      checked={form.checks.includes(option.key)}
                      onChange={() => toggleCheck(option.key)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'A publicar…' : 'Publicar exercício'}
            </button>
          </form>
        </section>
      )}

      <section className="card noticecard">
        <ClipboardIcon width={20} height={20} />
        <div>
          <h3>Permissões controladas no servidor</h3>
          <p className="muted">
            As rotas da área do professor exigem a função "teacher" na base de dados. Esconder o
            botão na interface não é suficiente: cada pedido é autorizado no backend.
          </p>
        </div>
      </section>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
