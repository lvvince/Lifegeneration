// useTheme.js — reads/writes theme preference, syncs with <html data-theme>
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lg-theme'

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return saved
    // Default: dark
    return 'dark'
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Apply on first mount before paint
  useEffect(() => {
    applyTheme(theme)
  }, []) // eslint-disable-line

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
