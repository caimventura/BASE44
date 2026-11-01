export default function SimulationPanel({ result, onClose }) {
  return (
    <section className="sheet">
      <div className="sheet__head">
        <div>
          <h2 className={result.ok ? 'ping--ok' : 'ping--fail'}>
            {result.ok ? 'Simulação concluída' : 'Simulação falhou'}
          </h2>
          <p className="sheet__type">Fluxo de pacotes</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      <ul className="log">
        {result.log.map((entry, index) => (
          <li key={index} className={`log__item log__item--${entry.level}`}>
            {entry.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
