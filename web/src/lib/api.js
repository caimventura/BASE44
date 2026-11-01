const request = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    let message = `Falha na requisição (${response.status}).`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }

  return response.status === 204 ? null : response.json()
}

export const api = {
  getLab: () => request('/api/lab'),
  createDevice: (payload) =>
    request('/api/devices', { method: 'POST', body: JSON.stringify(payload) }),
  updateDevice: (id, payload) =>
    request(`/api/devices/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDevice: (id) => request(`/api/devices/${id}`, { method: 'DELETE' }),
  createLink: (a, b) => request('/api/links', { method: 'POST', body: JSON.stringify({ a, b }) }),
  deleteLink: (id) => request(`/api/links/${id}`, { method: 'DELETE' }),
  simulate: (from, to) =>
    request('/api/simulate/ping', { method: 'POST', body: JSON.stringify({ from, to }) }),
}
