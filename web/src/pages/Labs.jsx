import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useRouter } from '../lib/router.jsx'
import { FlaskIcon, PlayIcon } from '../components/icons.jsx'
import { Modal, PageHeader, Spinner, Toast } from '../components/ui.jsx'

export default function Labs() {
  const { navigate } = useRouter()
  const [labs, setLabs] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    api.labs().then((data) => setLabs(data.labs)).catch((err) => setError(err.message))
  }, [])

  async function start(lab) {
    setBusy(lab.id)
    try {
      const result = await api.projectFromLab(lab.id, lab.title)
      navigate(`/simulador/${result.project.id}?lab=${lab.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Laboratórios práticos"
        title="Exercícios"
        description="Cada desafio abre uma topologia inicial. Configure-a e use o botão Avaliar no simulador — a nota é calculada a partir do estado real do laboratório."
      />

      {error && <p className="form-error" role="alert">{error}</p>}

      {!labs ? (
        <Spinner label="A carregar exercícios…" />
      ) : (
        <ul className="labgrid">
          {labs.map((lab) => (
            <li key={lab.id} className="card labcard">
              <div className="card__head">
                <span className="labcard__icon"><FlaskIcon width={18} height={18} /></span>
                <span className="tag">Nível {lab.level}</span>
                <span className="grow" />
                {lab.best !== null && lab.best !== undefined && (
                  <span className={`tag ${lab.best >= 12 ? 'tag--ok' : 'tag--warn'}`}>
                    Melhor: {Number(lab.best).toFixed(1)}/20
                  </span>
                )}
              </div>
              <h3>{lab.title}</h3>
              <p className="muted">{lab.objective}</p>
              <p className="small muted">{lab.brief}</p>
              <div className="row row--wrap">
                <button type="button" className="btn btn--primary btn--tiny" onClick={() => start(lab)} disabled={busy === lab.id}>
                  <PlayIcon width={14} height={14} /> {busy === lab.id ? 'A abrir…' : 'Iniciar laboratório'}
                </button>
                <button type="button" className="btn btn--tiny" onClick={() => setSelected(lab)}>
                  Ver instruções
                </button>
                <span className="small muted">{lab.instructions?.length ?? 0} passos</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <Modal
          title={selected.title}
          subtitle={selected.objective}
          onClose={() => setSelected(null)}
          footer={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setSelected(null)
                start(selected)
              }}
            >
              Iniciar laboratório
            </button>
          }
        >
          <p className="muted">{selected.brief}</p>
          <h3>Passos</h3>
          <ol className="steps">
            {(selected.instructions ?? []).map((step, index) => <li key={index}>{step}</li>)}
          </ol>
          <h3>Critérios de avaliação</h3>
          <p className="muted small">
            Os critérios são verificados no laboratório real — equipamentos, cabos, endereçamento,
            VLANs e comunicação por ping. A nota final é convertida para a escala de 0 a 20.
          </p>
        </Modal>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  )
}
