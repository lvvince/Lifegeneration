/* ---------------------------------------------------------------
   MEDIA SLOTS — dito mo lang papalitan ang mga picture at video.

   1. Ilagay ang file mo sa  public/media/  (gamit ang eksaktong pangalan sa ibaba)
   2. Tapos na. Kapag wala pang file, placeholder muna ang lalabas.

   Pictures  -> .webp  (mas magaan, mabilis sa phone)
   Videos    -> .mp4   (H.264, 1280x720 pataas, mas maganda kung < 15 MB)
   --------------------------------------------------------------- */
export const MEDIA = {
  hero:      { kind: 'image', src: '/media/hero.webp',          label: 'hero.webp',          ratio: '4 / 5',  hint: 'Portrait photo ng youth (1200 x 1500)' },
  intro:     { kind: 'video', src: '/media/life-gen-intro.mp4', poster: '/media/life-gen-intro-poster.webp', label: 'life-gen-intro.mp4', ratio: '16 / 9', hint: 'Intro video ng Life Gen (landscape)' },
  moment1:   { kind: 'image', src: '/media/moment-1.webp',      label: 'moment-1.webp',      ratio: '4 / 5',  hint: 'Worship / youth night' },
  moment2:   { kind: 'image', src: '/media/moment-2.webp',      label: 'moment-2.webp',      ratio: '1 / 1',  hint: 'D-Group fellowship' },
  moment3:   { kind: 'image', src: '/media/moment-3.webp',      label: 'moment-3.webp',      ratio: '4 / 5',  hint: 'Outreach / serving' },
  dgroup:    { kind: 'image', src: '/media/dgroup.webp',        label: 'dgroup.webp',        ratio: '16 / 10', hint: 'D-Group photo' },
  ministry:  { kind: 'image', src: '/media/ministry.webp',      label: 'ministry.webp',      ratio: '16 / 10', hint: 'Ministry team photo' },
  prayerVideo: { kind: 'video', src: '/media/prayer.mp4', poster: '/media/prayer.webp', label: 'prayer.mp4', ratio: '4 / 3', ambient: true, hint: 'Short prayer / worship clip (landscape, under 10 MB)' },
  prayer:    { kind: 'image', src: '/media/prayer.webp',        label: 'prayer.webp',        ratio: '1 / 1',  hint: 'Prayer / worship photo' },
  event:     { kind: 'image', src: '/media/event-default.webp', label: 'event-default.webp', ratio: '1 / 1',  hint: 'Default event picture' },
}
