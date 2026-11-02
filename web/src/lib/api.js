async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error('Sem ligação ao servidor. Verifique a sua ligação e tente novamente.')
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const error = new Error(body?.error ?? `Falha na operação (${response.status}).`)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : body
}

const post = (path, payload) =>
  request(path, { method: 'POST', body: JSON.stringify(payload ?? {}) })
const patch = (path, payload) =>
  request(path, { method: 'PATCH', body: JSON.stringify(payload ?? {}) })
const put = (path, payload) =>
  request(path, { method: 'PUT', body: JSON.stringify(payload ?? {}) })

export const api = {
  // autenticação
  me: () => request('/api/auth/me'),
  login: (email, password) => post('/api/auth/login', { email, password }),
  register: (payload) => post('/api/auth/register', payload),
  logout: () => post('/api/auth/logout'),
  forgot: (email) => post('/api/auth/forgot', { email }),
  reset: (token, password) => post('/api/auth/reset', { token, password }),
  updateProfile: (payload) => patch('/api/auth/profile', payload),

  // dashboard
  dashboard: () => request('/api/dashboard'),

  // projetos
  projects: () => request('/api/projects'),
  project: (id) => request(`/api/projects/${id}`),
  sharedProject: (slug) => request(`/api/projects/shared/${slug}`),
  createProject: (payload) => post('/api/projects', payload),
  projectFromLab: (labId, name) => post(`/api/projects/from-lab/${labId}`, { name }),
  updateProject: (id, payload) => patch(`/api/projects/${id}`, payload),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
  duplicateProject: (id) => post(`/api/projects/${id}/duplicate`),
  shareProject: (id, enabled) => post(`/api/projects/${id}/share`, { enabled }),
  saveTopology: (id, payload) => put(`/api/projects/${id}/topology`, payload),
  projectEvents: (id) => request(`/api/projects/${id}/events`),

  // simulação
  ping: (id, from, to, mode = 'ping') => post(`/api/projects/${id}/ping`, { from, to, mode }),
  dhcp: (id, deviceId) => post(`/api/projects/${id}/dhcp/${deviceId}`),
  dns: (id, deviceId, name) => post(`/api/projects/${id}/dns`, { deviceId, name }),
  service: (id, deviceId, hostname, service) =>
    post(`/api/projects/${id}/service`, { deviceId, hostname, service }),
  cli: (id, deviceId, command, mode) =>
    post(`/api/projects/${id}/cli`, { deviceId, command, mode }),
  netbot: (id, question, selectedDeviceId) => post(`/api/projects/${id}/netbot`, { question, selectedDeviceId }),
  verifyLab: (id, labId) => post(`/api/projects/${id}/labs/${labId}/verify`),

  // aprendizagem
  courses: () => request('/api/courses'),
  course: (slug) => request(`/api/courses/${slug}`),
  completeLesson: (id) => post(`/api/lessons/${id}/complete`),
  startPractice: (id) => post(`/api/lessons/${id}/practice`),
  labs: () => request('/api/labs'),
  lab: (id) => request(`/api/labs/${id}`),
  assessments: () => request('/api/assessments'),
  assessment: (id) => request(`/api/assessments/${id}`),
  submitAssessment: (id, answers) => post(`/api/assessments/${id}/submit`, { answers }),

  // professor
  teacherStudents: () => request('/api/teacher/students'),
  teacherSubmissions: () => request('/api/teacher/submissions'),
  teacherCreateLab: (payload) => post('/api/teacher/labs', payload),
  teacherDeleteLab: (id) => request(`/api/teacher/labs/${id}`, { method: 'DELETE' }),
}
