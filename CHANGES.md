# Round 13
- Custom dropdowns for every <select> (floating menu on desktop, bottom sheet on phones, keyboard support): lib/selectfx.js + styles/controls.css
- Clay checkbox, radio, switch (controls.css)
- Chat: ONE reaction per person per message (backend Chat.php react() + Chat.jsx); cleaner chips and mentions
- Members page redesigned (pages/admin/AdminMembers.jsx + styles/members.css), used by Officer and Admin
- Optional SQL to clean old duplicate reactions:
  DELETE r FROM chat_reactions r JOIN chat_reactions k ON k.message_id=r.message_id AND k.user_id=r.user_id AND k.reaction>r.reaction;
