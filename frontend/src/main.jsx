import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthModalProvider } from './context/AuthModal.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthModalProvider>
      <App />
    </AuthModalProvider>
  </BrowserRouter>
)