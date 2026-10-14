// All API calls go through Vite's proxy → backend
const BASE = '/api'

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// Auth
export const register = (username, email, password) =>
  request('POST', '/auth/register', { username, email, password })

export const login = (email, password) =>
  request('POST', '/auth/login', { email, password })

export const logout = (refresh_token) =>
  request('POST', '/auth/logout', { refresh_token })

export const getMe = (token) =>
  request('GET', '/auth/me', null, token)

// Chatbot
export const askChatbot = (q) =>
  request('GET', `/chatbot/ask?q=${encodeURIComponent(q)}`)

export const getFaqs = (category = null) =>
  request('GET', `/chatbot/faqs${category ? `?category=${category}` : ''}`)
