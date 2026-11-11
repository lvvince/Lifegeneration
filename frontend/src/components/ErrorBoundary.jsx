import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111',
          color: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#1c1c1e',
            border: '1px solid #333',
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(232, 93, 4, 0.15)',
              color: '#e85d04',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px'
            }}>
              ✦
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: '0.95rem', color: '#aaa', margin: '0 0 24px', lineHeight: 1.5 }}>
              The application encountered an unexpected issue. Please reload the page to continue.
            </p>
            {this.state.error?.message && (
              <div style={{
                backgroundColor: '#0d0d0f',
                border: '1px solid #222',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                color: '#e85d04',
                textAlign: 'left',
                margin: '0 0 24px',
                wordBreak: 'break-word',
                fontFamily: 'monospace'
              }}>
                {this.state.error.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/'
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '99px',
                  backgroundColor: '#e85d04',
                  color: '#111',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Go to Home
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '99px',
                  backgroundColor: 'transparent',
                  color: '#f5f5f5',
                  border: '1px solid #444',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

