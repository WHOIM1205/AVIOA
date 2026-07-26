import { useSelector } from 'react-redux'

const LABELS = {
  batch_lot_number: 'Batch',
  product_name: 'Product',
  customer_name: 'Customer',
  complaint_type: 'Type',
}

// Bonus Feature 5: warns about potential duplicates found at save time.
// Non-blocking — the user can still confirm the save.
export default function DuplicateCard() {
  const duplicates = useSelector((s) => s.complaint.duplicates)
  if (!duplicates || duplicates.length === 0) return null

  return (
    <div className="card card-warning">
      <div className="card-title">
        <span>⚠ Potential Duplicate Found</span>
      </div>
      <ul className="dup-list">
        {duplicates.map((d) => (
          <li key={d.id}>
            <strong>Complaint #{d.id}</strong> — {d.similarity}% similar
            {d.matched_fields.length > 0 && (
              <span className="dup-fields">
                {' '}(matched: {d.matched_fields.map((f) => LABELS[f] || f).join(', ')})
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="dup-hint">Review above. Click “Save anyway” to confirm.</div>
    </div>
  )
}
