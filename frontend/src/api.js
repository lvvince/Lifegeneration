export const API_URL = 'http://localhost/Lifegeneration/backend/public'

function extractPhpError(html) {
  const clean = (s) =>
    (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const type = clean(html.match(/exc-type">([\s\S]*?)<\/(?:span|div)>/)?.[1])
  const msg = clean(html.match(/exc-msg">([\s\S]*?)<\/(?:span|div)>/)?.[1])
  const file = clean(html.match(/file-path">([\s\S]*?)<\/(?:span|div)>/)?.[1])

  return [type, msg, file && `(${file})`].filter(Boolean).join(' ')
}

async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`
  let response

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    })
  } catch (error) {
    console.error('Fetch failed:', url, error)
    throw new Error(
      `Hindi makakonekta sa backend (${url}). Posibleng hindi tumatakbo ang Apache, mali ang API_URL, o CORS block. Tingnan ang Console/Network tab.`
    )
  }

  const text = await response.text()

  let data

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    console.error('Invalid response:', url, response.status, text)
    const phpError = extractPhpError(text)
    throw new Error(
      phpError
        ? `PHP error: ${phpError}`
        : `Invalid server response (${response.status}). Tingnan ang LavaLust/PHP error logs.`
    )
  }

  if (!response.ok) {
    const error = new Error(
      data.error || `Request failed: ${response.status}`
    )

    error.fields = data.fields || {}

    throw error
  }

  return data
}

export async function apiGet(path) {
  return apiRequest(path)
}

export async function apiPost(path, data) {
  return apiRequest(path, {
    method: 'POST',
    body: new URLSearchParams(data)
  })
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('lgy_user'))
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem('lgy_user')
}