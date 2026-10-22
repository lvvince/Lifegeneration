// useTheme.js — iisang theme store para sa buong app.
// Pareho pa rin ang API: const { theme, toggle } = useTheme()
import { useSyncExternalStore } from 'react'

const KEY = 'lg-theme'
const listeners = new Set()

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function saved() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

let current = saved() || systemTheme()

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}
apply(current)

function emit() {
  listeners.forEach((l) => l())
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return
  current = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* private mode: okay lang */
  }
  apply(theme)
  emit()
}

// Sumusunod sa system theme hangga't wala pang pinipili ang user
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (!saved()) {
    current = systemTheme()
    apply(current)
    emit()
  }
})

// Sync sa ibang tab
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    current = saved() || systemTheme()
    apply(current)
    emit()
  }
})

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'dark')
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return { theme, toggle, setTheme }
}
