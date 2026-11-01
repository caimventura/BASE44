import { useEffect, useState } from 'react'

export default function App() {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch('/api/items')
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load items (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAdd(event) {
    event.preventDefault()
    const value = title.trim()
    if (!value || saving) return

    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: value }),
      })
      if (!res.ok) throw new Error(`Could not add item (${res.status})`)
      const item = await res.json()
      setItems((prev) => [...prev, item])
      setTitle('')
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Could not delete item (${res.status})`)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="page">
      <section className="card">
        <header className="card__header">
          <h1>Starter App</h1>
          <p>React + Vite frontend, Express API, Postgres storage.</p>
        </header>

        <form className="add" onSubmit={handleAdd}>
          <input
            className="add__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add an item…"
            aria-label="Item title"
          />
          <button className="add__button" type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && <p className="banner banner--error">{error}</p>}

        {loading ? (
          <p className="hint">Loading items…</p>
        ) : items.length === 0 ? (
          <p className="hint">Nothing here yet — add your first item above.</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li className="list__item" key={item.id}>
                <span className="list__title">{item.title}</span>
                <button
                  className="list__delete"
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Delete ${item.title}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="card__footer">
          <span className="dot" /> API and database connected
        </footer>
      </section>
    </main>
  )
}
