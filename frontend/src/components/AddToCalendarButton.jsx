import { useState } from 'react'
import { addToGoogleCalendar } from '../utils/calendar.js'

export function GoogleCalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z" fill="#4285F4" />
      <path d="M11 11H7V15H11V11Z" fill="#34A853" />
      <path d="M17 11H13V15H17V11Z" fill="#FBBC05" />
      <path d="M11 16H7V18H11V16Z" fill="#EA4335" />
      <path d="M17 16H13V18H17V16Z" fill="#4285F4" />
    </svg>
  )
}

/**
 * AddToCalendarButton
 * @param {Object} props
 * @param {Object} props.event - Event data object
 * @param {'button'|'icon'|'small'} [props.variant='button']
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @param {string} [props.label='Add to Google Calendar']
 */
export default function AddToCalendarButton({
  event,
  variant = 'button',
  className = '',
  style = {},
  label = 'Add to Calendar'
}) {
  const [clicked, setClicked] = useState(false)

  if (!event || !event.event_date) return null

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setClicked(true)
    addToGoogleCalendar(event)
    setTimeout(() => setClicked(false), 2000)
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`btn-gcal-icon ${className}`}
        aria-label={`Add ${event.title || 'event'} to Google Calendar`}
        title="Add to Google Calendar"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid #dadce0',
          background: '#ffffff',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#4285f4'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 3px 8px rgba(66, 133, 244, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#dadce0'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
        }}
      >
        <GoogleCalendarIcon size={18} />
      </button>
    )
  }

  if (variant === 'small') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`btn-gcal-small ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#ffffff',
          color: '#3c4043',
          border: '1px solid #dadce0',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#4285f4'
          e.currentTarget.style.background = '#f8fafd'
          e.currentTarget.style.color = '#1a73e8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#dadce0'
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.color = '#3c4043'
        }}
      >
        <GoogleCalendarIcon size={16} />
        <span>{clicked ? 'Opening Google...' : label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`btn-gcal-full ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: '#ffffff',
        color: '#3c4043',
        border: '1px solid #dadce0',
        borderRadius: 8,
        padding: '10px 18px',
        fontSize: '0.88rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4285f4'
        e.currentTarget.style.background = '#f8fafd'
        e.currentTarget.style.color = '#1a73e8'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#dadce0'
        e.currentTarget.style.background = '#ffffff'
        e.currentTarget.style.color = '#3c4043'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'
      }}
    >
      <GoogleCalendarIcon size={18} />
      <span>{clicked ? 'Opening Google Calendar...' : label}</span>
    </button>
  )
}
