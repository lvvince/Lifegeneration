import { useState } from 'react'
import { Printer } from 'lucide-react'
import { PageHeader } from '../../components/portal/ui.jsx'
import Insights from '../../components/portal/Insights.jsx'
import PrintReportModal from '../../components/PrintReportModal.jsx'

export default function OfficerInsights() {
  const [showPrint, setShowPrint] = useState(false)

  return (
    <>
      <PageHeader
        title="Insights"
        desc="Where attendance, membership and giving are heading."
        actions={
          <button type="button" className="p-btn p-btn-primary" onClick={() => setShowPrint(true)}>
            <Printer size={16} /> Print / PDF
          </button>
        }
      />

      <Insights />

      {showPrint && <PrintReportModal onClose={() => setShowPrint(false)} />}
    </>
  )
}
