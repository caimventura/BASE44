import { RouterProvider, useRouter, Link } from './lib/router.jsx'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import Layout from './components/Layout.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Projects from './pages/Projects.jsx'
import Courses from './pages/Courses.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import Labs from './pages/Labs.jsx'
import Assessments from './pages/Assessments.jsx'
import Help from './pages/Help.jsx'
import Profile from './pages/Profile.jsx'
import Teacher from './pages/Teacher.jsx'
import SharedProject from './pages/SharedProject.jsx'
import SimulatorPage from './components/sim/SimulatorPage.jsx'
import { Spinner } from './components/ui.jsx'

function NotFound() {
  return (
    <div className="page">
      <h1>Página não encontrada</h1>
      <p className="muted">O endereço pedido não existe nesta aplicação.</p>
      <Link className="btn btn--primary" to="/">Voltar ao painel</Link>
    </div>
  )
}

function Shell() {
  const { user, loading, logout } = useAuth()
  const { path, navigate } = useRouter()

  const shared = path.match(/^\/partilhar\/([a-z0-9]+)$/i)
  if (shared) return <SharedProject slug={shared[1]} />

  if (loading) {
    return (
      <div className="splash">
        <Spinner label="A carregar o NETLAB ACADEMY…" />
      </div>
    )
  }

  if (!user) return <AuthPage />

  const simulator = path.match(/^\/simulador(?:\/(\d+))?$/)
  const course = path.match(/^\/cursos\/([^/]+)$/)

  let content
  if (path === '/') content = <Dashboard />
  else if (simulator) content = <SimulatorPage projectId={simulator[1] ? Number(simulator[1]) : null} />
  else if (path === '/projetos') content = <Projects />
  else if (path === '/cursos') content = <Courses />
  else if (course) content = <CourseDetail slug={course[1]} />
  else if (path === '/laboratorios') content = <Labs />
  else if (path === '/avaliacoes') content = <Assessments />
  else if (path === '/ajuda') content = <Help />
  else if (path === '/perfil') content = <Profile />
  else if (path === '/professor') {
    content = user.role === 'teacher' ? (
      <Teacher />
    ) : (
      <div className="page">
        <h1>Acesso restrito</h1>
        <p className="muted">Esta área é apenas para professores. As permissões são verificadas no servidor.</p>
        <Link className="btn" to="/">Voltar ao painel</Link>
      </div>
    )
  } else content = <NotFound />

  return (
    <Layout
      user={user}
      onLogout={async () => {
        await logout()
        navigate('/')
      }}
    >
      {content}
    </Layout>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </RouterProvider>
  )
}
