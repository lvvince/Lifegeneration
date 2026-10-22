// Simple na line icons (isang kulay, sumusunod sa currentColor) para sa social links.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const solid = { fill: 'currentColor', 'aria-hidden': true }

export function FacebookIcon({ size = 20, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...solid} {...rest}>
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.2H7.5V14h2.8v8h3.2z" />
    </svg>
  )
}

export function InstagramIcon({ size = 20, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function TikTokIcon({ size = 20, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...solid} {...rest}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6a2.6 2.6 0 0 1 3.2-2.52V9.6a5.7 5.7 0 0 0-.6-.03 5.7 5.7 0 1 0 5.7 5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  )
}

export const SOCIALS = {
  facebook: 'https://www.facebook.com/life.generation.calapan',
  radical: 'https://www.facebook.com/radicalledcalapan',
  instagram: 'https://www.instagram.com/lifegencalapan?psln=ZDNlZDc0MzIxNw==',
  tiktok: 'https://www.tiktok.com/@life.generation7?is_from_webapp=1&sender_device=pc',
}
