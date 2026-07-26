import { useSelector } from 'react-redux'

// Human-readable labels for the 13 field keys (kept local so the card is self-contained).
const LABELS = {
  complaint_source: 'Complaint Source',
  customer_name: 'Customer Name',
  product_name: 'Product Name',
  product_strength_grade: 'Product Strength/Grade',
  batch_lot_number: 'Batch/Lot Number',
  manufacturing_date: 'Manufacturing Date',
  expiry_date: 'Expiry Date',
  quantity_affected: 'Quantity Affected',
  complaint_type: 'Complaint Type',
  complaint_date: 'Complaint Date',
  detailed_description: 'Detailed Description',
  initial_severity: 'Initial Severity',
  priority: 'Priority',
}

// Bonus Feature 1: shows which fields are filled and an overall completeness score.
// Reads straight from Redux; renders nothing until there is something to show.
export default function CompletenessCard() {
  const completeness = useSelector((s) => s.complaint.completeness)
  const fields = completeness && completeness.fields
  if (!fields || completeness.score === 0) return null

  return (
    <div className="card">
      <div className="card-title">
        <span>Complaint Completeness</span>
        <span className="score">{completeness.score}%</span>
      </div>
      <div className="score-bar">
        <div className="score-fill" style={{ width: completeness.score + '%' }} />
      </div>
      <ul className="check-list">
        {Object.entries(fields).map(([key, present]) => (
          <li key={key} className={present ? 'present' : 'missing'}>
            <span className="tick">{present ? '✔' : '✖'}</span> {LABELS[key] || key}
          </li>
        ))}
      </ul>
    </div>
  )
}
