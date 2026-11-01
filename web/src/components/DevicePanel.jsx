import { useEffect, useState } from 'react'

const TYPE_LABEL = { pc: 'Computador', switch: 'Switch', router: 'Roteador' }

const toDraft = (device) => ({
  name: device.name ?? '',
  ip: device.ip ?? '',
  mask: device.mask ?? '',
  gateway: device.gateway ?? '',
  ip2: device.ip2 ?? '',
  mask2: device.mask2 ?? '',
})

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode="decimal"
        autoComplete="off"
        spellCheck="false"
      />
    </label>
  )
}

export default function DevicePanel({
  device,
  connections,
  onSave,
  onDelete,
  onRemoveLink,
  onClose,
}) {
  const [draft, setDraft] = useState(() => toDraft(device))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(toDraft(device))
  }, [device])

  const update = (field) => (event) =>
    setDraft((previous) => ({ ...previous, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(draft)
    } catch {
      // the app shows the error banner
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="sheet" onSubmit={handleSubmit}>
      <div className="sheet__head">
        <div>
          <h2>{device.name}</h2>
          <p className="sheet__type">{TYPE_LABEL[device.type]}</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      <Field label="Nome" value={draft.name} onChange={update('name')} placeholder="PC1" />

      {device.type === 'switch' && (
        <p className="sheet__note">
          O switch não precisa de IP: ele só repassa os quadros dentro da rede local.
        </p>
      )}

      {device.type === 'pc' && (
        <>
          <div className="grid">
            <Field label="IP" value={draft.ip} onChange={update('ip')} placeholder="192.168.0.10" />
            <Field
              label="Máscara"
              value={draft.mask}
              onChange={update('mask')}
              placeholder="255.255.255.0"
            />
          </div>
          <Field
            label="Gateway padrão"
            value={draft.gateway}
            onChange={update('gateway')}
            placeholder="192.168.0.1"
          />
        </>
      )}

      {device.type === 'router' && (
        <>
          <p className="sheet__note">
            Cada interface precisa de um IP na sub-rede do segmento ligado a ela.
          </p>
          <div className="grid">
            <Field
              label="Interface 1 — IP"
              value={draft.ip}
              onChange={update('ip')}
              placeholder="192.168.0.1"
            />
            <Field
              label="Interface 1 — máscara"
              value={draft.mask}
              onChange={update('mask')}
              placeholder="255.255.255.0"
            />
          </div>
          <div className="grid">
            <Field
              label="Interface 2 — IP"
              value={draft.ip2}
              onChange={update('ip2')}
              placeholder="10.0.0.1"
            />
            <Field
              label="Interface 2 — máscara"
              value={draft.mask2}
              onChange={update('mask2')}
              placeholder="255.255.255.0"
            />
          </div>
        </>
      )}

      <section className="connections">
        <h3>Conexões</h3>
        {connections.length === 0 ? (
          <p className="sheet__note">Nenhum cabo ligado.</p>
        ) : (
          <ul>
            {connections.map((connection) => (
              <li key={connection.id}>
                <span>{connection.name}</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => onRemoveLink(connection.id)}
                >
                  Remover cabo
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sheet__actions">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="button button--danger" onClick={onDelete}>
          Excluir
        </button>
      </div>
    </form>
  )
}
