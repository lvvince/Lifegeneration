/* ---------------------------------------------------------------
   FAQ ng Life Generation — dito mo lang i-edit ang mga tanong at sagot.
   id   : unique, ginagamit ng search at ng link (/dashboard#faq-<id>)
   cat  : 'dgroups' | 'events' | 'serve' | 'account'
   a    : array ng paragraph (string)
   go   : (optional) { to, label } — button sa baba ng sagot
   --------------------------------------------------------------- */
export const FAQ_CATS = [
  { id: 'all', label: 'All' },
  { id: 'dgroups', label: 'D-Groups' },
  { id: 'events', label: 'Events' },
  { id: 'serve', label: 'Serve & Pray' },
  { id: 'account', label: 'My account' },
]

export const FAQS = [
  {
    id: 'meeting',
    cat: 'dgroups',
    q: 'What happens during a D-Group meeting?',
    a: [
      'We always start by sharing praise reports and celebrating what God is doing in our personal lives. Then we watch a short video or listen to a short teaching, and talk about how it applies to our lives.',
      'At the end, we pray for each other. Everyone is welcome to share, and nobody is forced to.',
    ],
  },
  {
    id: 'join-dgroup',
    cat: 'dgroups',
    q: 'How do I join a D-Group?',
    a: [
      'Open D-Groups, pick a group that fits your schedule and location, then tap Request to Join. Your request goes to the group leader.',
      'Once the leader approves you, the group chat link unlocks on the same card, so you can say hi before the first meeting.',
    ],
    go: { to: '/dgroups', label: 'Browse D-Groups' },
  },
  {
    id: 'switch-group',
    cat: 'dgroups',
    q: "I don't like my group. Can I try another one?",
    a: [
      'Yes. Tap Leave D-Group on your group card, then send a request to a different group. It is okay to look for the right fit.',
      'If something feels off, you can also talk to your leader or any officer first. We would like to hear it.',
    ],
    go: { to: '/dgroups', label: 'Open D-Groups' },
  },
  {
    id: 'miss-meeting',
    cat: 'dgroups',
    q: "What if I can't make it to a meeting?",
    a: [
      'No problem. Life happens. Send a quick message in your group chat so your leader knows, and catch up with the group at the next meeting.',
      'We do encourage you to be consistent, because growth happens best in community.',
    ],
  },
  {
    id: 'invite-friend',
    cat: 'dgroups',
    q: 'I have a friend who wants to join. Are they welcome?',
    a: [
      'Absolutely. Invite them to any upcoming event first so they can meet the community. Then they can sign up on the registration page, and the officers will review and approve the account.',
      'After that, they can request to join a D-Group just like you did.',
    ],
    go: { to: '/events', label: 'See upcoming events' },
  },
  {
    id: 'rsvp',
    cat: 'events',
    q: 'How do I reserve a seat for an event?',
    a: [
      'Open Events, choose the gathering you want to attend and tap RSVP. You will see a Going label on the event, and it also appears under My events on your profile.',
      'Plans changed? Tap Cancel my RSVP so someone else can take your spot.',
    ],
    go: { to: '/events', label: 'Open Events' },
  },
  {
    id: 'check-in',
    cat: 'events',
    q: 'How does check-in work?',
    a: [
      'Open your profile and tap View digital pass. It shows your personal QR code. At the event, the officers scan it and your attendance is recorded automatically.',
      'Tip: open the pass before you arrive so it is ready, and turn up your screen brightness.',
    ],
    go: { to: '/dashboard/profile', label: 'Open my digital pass' },
  },
  {
    id: 'reminders',
    cat: 'events',
    q: 'Will I get reminders about events?',
    a: [
      'Yes. Events you are going to appear in Notifications starting 3 days before, counting down to Tomorrow and Today. New announcements also pop up at the top of the portal.',
      'You can add any event to your Google Calendar with one tap.',
    ],
  },
  {
    id: 'serve',
    cat: 'serve',
    q: 'How can I serve in a ministry?',
    a: [
      'Open Ministries and tap Apply to serve on the team you are interested in. The ministry leader reviews your application and you will see its status on the card.',
      'You do not have to be an expert. We need people who are willing.',
    ],
    go: { to: '/ministries', label: 'See ministries' },
  },
  {
    id: 'prayer',
    cat: 'serve',
    q: 'Who can see my prayer request?',
    a: [
      'When you post on the Prayer Wall you choose who sees it: everyone in the community, or only the leaders. You can also post anonymously.',
      'When God answers, mark your request as Answered so we can celebrate with you.',
    ],
    go: { to: '/prayer', label: 'Open Prayer Wall' },
  },
  {
    id: 'profile',
    cat: 'account',
    q: 'How do I change my photo or personal details?',
    a: [
      'Open your profile from the account button in the left menu. Use Change photo to upload a new picture, and Edit details to update your name, age or address.',
    ],
    go: { to: '/dashboard/profile', label: 'Open my profile' },
  },
  {
    id: 'theme',
    cat: 'account',
    q: 'Can I switch between light and dark mode?',
    a: [
      'Yes. Tap the account icon in the left menu and choose Dark mode or Light mode. We remember your choice on this device.',
    ],
  },
]
