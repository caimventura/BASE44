import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { categoryOf, labelOf } from '../../lib/catalog.js'

const BANNER = (device) => {
  const category = categoryOf(device.type)
  if (category === 'end') {
    return [
      `NETLAB ACADEMY — terminal de ${device.name || 'dispositivo'} (${labelOf(device.type)})`,
      'Escreva "help" para ver os comandos disponíveis.',
    ]
  }
  return [
    `NETLAB ACADEMY — CLI simulada de ${device.name || 'equipamento'} (${labelOf(device.type)})`,
    'Ambiente educativo inspirado em CLI de rede. Não é software oficial de nenhum fabricante.',
    'Escreva "help" para ver os comandos disponíveis.',
  ]
}

export default function TerminalTab({ projectId, device, onConfigChanged }) {
  const [lines, setLines] = useState(() => BANNER(device))
  const [mode, setMode] = useState('user')
  const [prompt, setPrompt] = useState(`${device.name}>`)
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const outputRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setLines(BANNER(device))
    setMode('user')
    setPrompt(`${device.name}>`)
  }, [device.id])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [lines])

  async function submit(event) {
    event.preventDefault()
    const value = command.trim()
    if (!value || busy) return
    setBusy(true)
    setCommand('')
    setHistory((previous) => [...previous, value])
    setHistoryIndex(-1)
    setLines((previous) => [...previous, `${prompt} ${value}`])
    try {
      const result = await api.cli(projectId, device.id, value, mode)
      setLines((previous) => [...previous, ...(result.output ? result.output.split('\n') : [])])
      setMode(result.mode)
      setPrompt(result.prompt)
      if (result.changed) onConfigChanged?.()
    } catch (error) {
      setLines((previous) => [...previous, `% ${error.message}`])
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const index = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1)
      if (history[index] !== undefined) {
        setCommand(history[index])
        setHistoryIndex(index)
      }
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const index = Math.min(history.length, historyIndex + 1)
      setHistoryIndex(index)
      setCommand(history[index] ?? '')
    }
  }

  return (
    <div className="terminal">
      <div className="terminal__output" ref={outputRef} aria-live="polite">
        {lines.map((line, index) => (
          <pre key={index} className={line.startsWith('%') ? 'terminal__line terminal__line--error' : 'terminal__line'}>
            {line}
          </pre>
        ))}
      </div>
      <form className="terminal__form" onSubmit={submit}>
        <span className="terminal__prompt">{prompt}</span>
        <input
          ref={inputRef}
          className="terminal__input"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={busy ? 'a executar…' : 'escreva um comando e pressione Enter'}
          autoComplete="off"
          spellCheck="false"
          aria-label="Comando"
        />
        <button type="submit" className="terminal__send" disabled={busy} aria-label="Executar comando">
          Executar
        </button>
      </form>
    </div>
  )
}
