import { useSelector } from 'react-redux'

// Bonus Feature 2: a short professional summary of the complaint.
export default function SummaryCard() {
  const summary = useSelector((s) => s.complaint.summary)
  if (!summary) return null

  return (
    <div className="card">
      <div className="card-title"><span>Complaint Summary</span></div>
      <p className="advisory-text">{summary}</p>
    </div>
  )
}
