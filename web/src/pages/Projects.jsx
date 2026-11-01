import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Link, useRouter } from '../lib/router.jsx'
import { CopyIcon, FolderIcon, PlusIcon, TrashIcon } from '../components/icons.jsx'
import { Empty, Modal, PageHeader, Spinner, Toast } from '../components/ui.jsx'

export default function Projects() {
  const { navigate } = useRouter()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', template: 'empty' })
  const [renaming, setRenaming] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    api
      .projects()
      .then((data) => setProjects(data.projects))
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const data = await api.createProject({
        name: form.name.trim() || 'Novo laboratório',
        description: form.description,
        template: form.template === 'lan' ? 'lan' : undefined,
      })
      setCreating(false)
      setForm({ name: '', description: '', template: 'empty' })
      navigate(`/simulador/${data.project.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function duplicate(project) {
    setBusy(true)
    try {
      await api.duplicateProject(project.id)
      await load()
      setToast({ message: `Projeto "${project.name}" duplicado.`, tone: 'ok' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(project) {
    if (!window.confirm(`Eliminar o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deleteProject(project.id)
      await load()
      setToast({ message: 'Projeto eliminado.', tone: 'ok' })
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleShare(project) {
    try {
      const data = await api.shareProject(project.id, !project.share_enabled)
      await load()
      if (data.project.share_enabled) {
        const url = `${window.location.origin}/partilhar/${data.project.share_slug}`
        try {
          await navigator.clipboard.writeText(url)
          setToast({ message: 'Ligação de partilha copiada.', tone: 'ok' })
        } catch {
          setToast({ message: `Partilha ativa: ${url}`, tone: 'ok' })
        }
      } else {
        setToast({ message: 'Partilha desativada.', tone: 'warn' })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function rename(event) {
    event.preventDefault()
    if (!renaming) return
    setBusy(true)
    try {
      await api.updateProject(renaming.id, { name: renaming.name, description: renaming.description })
      setRenaming(null)
      await load()
      setToast({ message: 'Projeto atualizado.', tone: 'ok' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Gestão de projetos"
        title="Meus projetos"
        description="Cada projeto guarda equipamentos, posições, cabos, endereços, VLANs, rotas e configurações."
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            <PlusIcon width={17} height={17} /> Criar novo laboratório
          </button>
        }
      />

      {error && <p className="form-error" role="alert">{error}</p>}

      {!projects ? (
        <Spinner label="A carregar projetos…" />
      ) : projects.length === 0 ? (
        <Empty
          title="Ainda não tem projetos"
          description="Crie o primeiro laboratório e comece a ligar equipamentos."
          action={
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              Criar laboratório
            </button>
          }
        />
      ) : (
        <ul className="projectgrid">
          {projects.map((project) => (
            <li key={project.id} className="card projectcard">
              <div className="card__head">
                <span className="projectcard__icon"><FolderIcon width={18} height={18} /></span>
                <span className="grow" />
                <span className="tag">{project.device_count} disp.</span>
              </div>
              <h3>{project.name}</h3>
              <p className="muted">{project.description || 'Sem descrição.'}</p>
              <p className="small muted">
                {project.link_count} cabos · atualizado em{' '}
                {new Date(project.updated_at).toLocaleDateString('pt-PT')}
              </p>
              {project.share_enabled && (
                <p className="small mono">/partilhar/{project.share_slug}</p>
              )}
              <div className="row row--wrap">
                <Link className="btn btn--primary btn--tiny" to={`/simulador/${project.id}`}>Abrir</Link>
                <button type="button" className="btn btn--tiny" onClick={() => setRenaming({ ...project })}>Renomear</button>
                <button type="button" className="btn btn--tiny" onClick={() => duplicate(project)} disabled={busy}>
                  <CopyIcon width={13} height={13} /> Duplicar
                </button>
                <button type="button" className="btn btn--tiny" onClick={() => toggleShare(project)}>
                  {project.share_enabled ? 'Parar partilha' : 'Partilhar'}
                </button>
                <button type="button" className="btn btn--tiny btn--danger" onClick={() => remove(project)}>
                  <TrashIcon width={13} height={13} /> Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <Modal
          title="Criar novo laboratório"
          subtitle="Escolha um nome e comece com a área vazia ou com uma LAN pronta."
          onClose={() => setCreating(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setCreating(false)}>Cancelar</button>
              <button type="submit" form="create-project" className="btn btn--primary" disabled={busy}>
                Criar e abrir
              </button>
            </>
          }
        >
          <form id="create-project" onSubmit={create} className="stack">
            <label className="field">
              <span className="field__label">Nome do laboratório</span>
              <input
                className="field__input"
                value={form.name}
                onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="Rede da turma 11.º B"
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field__label">Descrição (opcional)</span>
              <input
                className="field__input"
                value={form.description}
                onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                placeholder="Objetivo do laboratório"
              />
            </label>
            <label className="field">
              <span className="field__label">Topologia inicial</span>
              <select
                className="field__input"
                value={form.template}
                onChange={(event) => setForm((previous) => ({ ...previous, template: event.target.value }))}
              >
                <option value="empty">Área de trabalho vazia</option>
                <option value="lan">LAN com switch e dois computadores</option>
              </select>
            </label>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal
          title="Renomear projeto"
          onClose={() => setRenaming(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRenaming(null)}>Cancelar</button>
              <button type="submit" form="rename-project" className="btn btn--primary" disabled={busy}>
                Guardar
              </button>
            </>
          }
        >
          <form id="rename-project" onSubmit={rename} className="stack">
            <label className="field">
              <span className="field__label">Nome</span>
              <input
                className="field__input"
                value={renaming.name}
                onChange={(event) => setRenaming((previous) => ({ ...previous, name: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span className="field__label">Descrição</span>
              <input
                className="field__input"
                value={renaming.description ?? ''}
                onChange={(event) => setRenaming((previous) => ({ ...previous, description: event.target.value }))}
              />
            </label>
          </form>
        </Modal>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
