import MemberShell from './MemberShell.jsx'
import '../../styles/portal.css'
import '../../styles/portal2.css'
import '../../styles/pages.css'
import '../../styles/member.css'
import '../../styles/sky.css' // laging huli para ito ang masunod

/* Isang layout para sa member, officer at admin: icon rail + sidebar na lumalabas lang kapag pinindot. */
export default function PortalLayout({ children }) {
  return <MemberShell>{children}</MemberShell>
}