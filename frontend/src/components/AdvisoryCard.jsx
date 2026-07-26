import { useSelector } from 'react-redux'

// Bonus Features 3 & 4: probable root causes and recommended CAPA. Both come from the
// same advise node, so they share one card. Renders nothing until there's content.
export default function AdvisoryCard() {
  const rootCauses = useSelector((s) => s.complaint.rootCauses)
  const capa = useSelector((s) => s.complaint.capa)
  if ((!rootCauses || rootCauses.length === 0) && (!capa || capa.length === 0)) return null

  return (
    <div className="card">
      {rootCauses && rootCauses.length > 0 && (
        <>
          <div className="card-title"><span>Possible Root Causes</span></div>
          <ul className="advisory-list">
            {rootCauses.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </>
      )}
      {capa && capa.length > 0 && (
        <>
          <div className="card-title advisory-subtitle"><span>Recommended CAPA</span></div>
          <ul className="advisory-list">
            {capa.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </>
      )}
    </div>
  )
}
