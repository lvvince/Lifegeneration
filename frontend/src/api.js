// API Client for Life Generation
export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost/Lifegeneration/backend/public'

function extractPhpError(html) {
  const clean = (s) =>
    (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const type = clean(html.match(/exc-type">([\s\S]*?)<\/(?:span|div)>/)?.[1])
  const msg = clean(html.match(/exc-msg">([\s\S]*?)<\/(?:span|div)>/)?.[1])
  const file = clean(html.match(/file-path">([\s\S]*?)<\/(?:span|div)>/)?.[1])

  return [type, msg, file && `(${file})`].filter(Boolean).join(' ')
}

export async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`
  const token = localStorage.getItem('access_token')

  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    console.error('Fetch failed:', url, error)
    throw new Error(
      `Unable to connect to backend (${url}). Please check server and database.`
    )
  }

  const text = await response.text()
  let data

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    console.error('Invalid JSON response:', url, response.status, text)
    const phpError = extractPhpError(text)
    throw new Error(
      phpError
        ? `PHP error: ${phpError}`
        : `Invalid server response (${response.status}). Check server logs.`
    )
  }

  // Handle 401 token refresh if refresh_token exists
  if (response.status === 401 && !options._isRetry) {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        const refreshData = await refreshRes.json()
        if (refreshData?.tokens?.access_token) {
          localStorage.setItem('access_token', refreshData.tokens.access_token)
          if (refreshData.tokens.refresh_token) {
            localStorage.setItem('refresh_token', refreshData.tokens.refresh_token)
          }
          return apiRequest(path, { ...options, _isRetry: true })
        }
      } catch {
        logout()
      }
    }
  }

  if (!response.ok) {
    const error = new Error(data.error || `Request failed: ${response.status}`)
    error.status = response.status
    error.fields = data.fields || {}
    throw error
  }

  return data
}

export async function apiGet(path) {
  return apiRequest(path)
}

export async function apiPost(path, data = {}) {
  return apiRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// User & Token helpers
export function getUser() {
  try {
    const raw = localStorage.getItem('lgy_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('lgy_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('lgy_user')
  }
}

export function saveTokens(tokens) {
  if (tokens?.access_token) {
    localStorage.setItem('access_token', tokens.access_token)
  }
  if (tokens?.refresh_token) {
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }
}

export function logout() {
  const refreshToken = localStorage.getItem('refresh_token')
  if (refreshToken) {
    apiPost('/api/auth/logout', { refresh_token: refreshToken }).catch(() => {})
  }
  localStorage.removeItem('lgy_user')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}