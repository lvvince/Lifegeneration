import { useState } from 'react'
import { Printer } from 'lucide-react'
import { PageHeader } from '../../components/portal/ui.jsx'
import Insights from '../../components/portal/Insights.jsx'
import PrintReportModal from '../../components/PrintReportModal.jsx'

export default function OfficerInsights() {
  const [showPrint, setShowPrint] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <PageHeader title="Insights" desc="Where attendance, membership and giving are heading, and who may need a check-in." />
        <button
          type="button"
          className="p-btn p-btn-primary"
          onClick={() => setShowPrint(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0, alignSelf: 'flex-end' }}
        >
          <Printer size={16} />
          Print / PDF
        </button>
      </div>

      <Insights />

      {showPrint && <PrintReportModal onClose={() => setShowPrint(false)} />}
    </>
  )
}
