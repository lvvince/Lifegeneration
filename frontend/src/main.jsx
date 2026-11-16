import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/refine.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthModalProvider } from './context/AuthModal.jsx'
import './index.css'

// Register Service Worker for PWA install support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently — app still works normally
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthModalProvider>
          <App />
        </AuthModalProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)