import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { useRouter, Link } from '../lib/router.jsx'
import {
  BookIcon,
  ClipboardIcon,
  ClockIcon,
  FlaskIcon,
  FolderIcon,
  HelpIcon,
  NetworkIcon,
  PlusIcon,
  StarIcon,
  RocketIcon,
} from '../components/icons.jsx'
import { PageHeader, StatCard, ProgressBar, Spinner, Toast, formatMinutes } from '../components/ui.jsx'

const RECOMMENDED = [
  'Primeira ligação entre dois computadores',
  'Construção de uma rede LAN',
  'Configuração de um switch',
  'Configuração de um router',
  'Configuração de endereços IP',
  'Comunicação entre duas redes',
  'Configuração de DHCP',
  'Configuração de DNS',
  'Criação de VLANs',
  'Configuração de uma rede Wi-Fi',
]

export default function Dashboard() {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [labs, setLabs] = useState([])

  useEffect(() => {
    Promise.all([api.dashboard(), api.labs()])
      .then(([dashboard, labList]) => {
        setData(dashboard)
        setLabs(labList.labs)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function createLab() {
    setBusy(true)
    try {
      const result = await api.createProject({ name: 'Novo laboratório', template: 'lan' })
      navigate(`/simulador/${result.project.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function startLab(lab) {
    setBusy(true)
    try {
      const result = await api.projectFromLab(lab.id, lab.title)
      navigate(`/simulador/${result.project.id}?lab=${lab.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="page">
        {error ? <p className="form-error" role="alert">{error}</p> : <Spinner label="A carregar o painel…" />}
      </div>
    )
  }

  const { stats, recommended, submissions } = data
  const inProgress = labs.filter((lab) => lab.status === 'in_progress' && lab.score !== null)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Painel do estudante"
        title={`Bem-vindo, ${user?.name?.split(' ')[0] ?? 'estudante'}`}
        description="Continue a construir, configurar e testar redes. O seu progresso é guardado automaticamente."
        actions={
          <>
            <button type="button" className="btn btn--primary" onClick={createLab} disabled={busy}>
              <PlusIcon width={17} height={17} /> Criar novo laboratório
            </button>
            <Link className="btn" to="/projetos">Abrir projeto</Link>
          </>
        }
      />

      <section className="stats">
        <StatCard icon={FolderIcon} label="Laboratórios criados" value={stats.projects} hint="Projetos guardados" />
        <StatCard
          icon={FlaskIcon}
          label="Exercícios concluídos"
          value={stats.exercisesDone}
          hint={`${stats.lessonsDone} ${stats.lessonsDone === 1 ? 'lição concluída' : 'lições concluídas'}`}
        />
        <StatCard icon={ClipboardIcon} label="Progresso" value={`${stats.progress}%`} hint="Cursos, exercícios e avaliações" />
        <StatCard icon={ClockIcon} label="Tempo de aprendizagem" value={formatMinutes(stats.minutesLearning)} hint="Estimado pelas atividades" />
        <StatCard icon={StarIcon} label="Nível atual" value={stats.level} hint={`${stats.xp} XP acumulados`} tone="accent" />
        <StatCard icon={BookIcon} label="Etapa de aprendizagem" value={stats.stage ?? 'Iniciante'} hint={`${stats.lessonsDone} lições concluídas`} />
      </section>

      <section className="quickgrid">
        <Link className="quick" to="/cursos">
          <BookIcon width={20} height={20} />
          <span><strong>Continuar aprendizagem</strong><small>Cursos por níveis</small></span>
        </Link>
        <Link className="quick" to="/projetos">
          <FolderIcon width={20} height={20} />
          <span><strong>Meus projetos</strong><small>Guardar e reabrir</small></span>
        </Link>
        <Link className="quick" to="/laboratorios">
          <FlaskIcon width={20} height={20} />
          <span><strong>Exercícios</strong><small>Desafios avaliados</small></span>
        </Link>
        <Link className="quick" to="/avaliacoes">
          <ClipboardIcon width={20} height={20} />
          <span><strong>Avaliações</strong><small>Testes de 0 a 20</small></span>
        </Link>
        <Link className="quick" to="/simulador">
          <NetworkIcon width={20} height={20} />
          <span><strong>Simulador</strong><small>Área de trabalho</small></span>
        </Link>
        <Link className="quick" to="/ajuda">
          <HelpIcon width={20} height={20} />
          <span><strong>Ajuda</strong><small>Guia e comandos</small></span>
        </Link>
      </section>

      <div className="dashgrid">
        <section className="card">
          <header className="card__head">
            <div>
              <p className="eyebrow">Trilho recomendado</p>
              <h2>Laboratórios recomendados</h2>
            </div>
            <span className="tag">{recommended.length} desafios</span>
          </header>
          <ol className="lablist">
            {recommended.map((lab, index) => (
              <li key={lab.id} className="lablist__item">
                <span className="lablist__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="lablist__meta">
                  <strong>{lab.title.replace(/^Laboratório \d+ — /, '')}</strong>
                  <small>{lab.objective}</small>
                  {lab.status && (
                    <span className={`tag ${lab.status === 'completed' ? 'tag--ok' : 'tag--warn'}`}>
                      {lab.status === 'completed' ? `Concluído · ${lab.score?.toFixed(1)}/20` : 'Em progresso'}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn btn--tiny"
                  onClick={() => startLab(lab)}
                  disabled={busy}
                >
                  Abrir <RocketIcon width={13} height={13} />
                </button>
              </li>
            ))}
          </ol>
          <p className="muted small">
            Os dez percursos indicados no plano de estudos: {RECOMMENDED.join(' · ')}.
          </p>
        </section>

        <div className="dashcol">
          <section className="card">
            <header className="card__head">
              <h2>Progresso geral</h2>
              <span className="tag">{stats.progress}%</span>
            </header>
            <ProgressBar value={stats.progress} label="Progresso geral" />
            <ul className="metrics">
              <li><span>Lições concluídas</span><strong>{stats.lessonsDone}</strong></li>
              <li><span>Avaliações realizadas</span><strong>{stats.assessmentsDone}</strong></li>
              <li><span>Média nas avaliações</span><strong>{stats.averageScore || '—'}</strong></li>
              <li><span>Exercícios por concluir</span><strong>{inProgress.length}</strong></li>
            </ul>
          </section>

          <section className="card">
            <header className="card__head">
              <h2>Últimas avaliações</h2>
              <Link to="/laboratorios" className="link">Ver todos</Link>
            </header>
            {submissions.length === 0 ? (
              <p className="muted">Ainda não submeteu exercícios. Comece pelo primeiro laboratório.</p>
            ) : (
              <ul className="list">
                {submissions.map((submission, index) => (
                  <li key={index} className="list__row">
                    <span>
                      <strong>{submission.title}</strong>
                      <small className="muted"> · {new Date(submission.created_at).toLocaleDateString('pt-PT')}</small>
                    </span>
                    <span className={`tag ${submission.score >= 12 ? 'tag--ok' : 'tag--warn'}`}>
                      {Number(submission.score).toFixed(1)}/20
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
