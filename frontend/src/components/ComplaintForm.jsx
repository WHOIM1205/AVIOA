import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { resetComplaint, setDuplicates, clearDuplicates } from '../features/complaintSlice'
import { saveComplaint, checkDuplicate } from '../api'
import DuplicateCard from './DuplicateCard'

// The four sections mirror the reference UI. Each field is [key, label, isFullWidth].
const SECTIONS = [
  { title: '1. Origin & Customer Details', fields: [
    ['complaint_source', 'Complaint Source'],
    ['customer_name', 'Customer Name'],
  ] },
  { title: '2. Product & Batch Identification', fields: [
    ['product_name', 'Product Name'],
    ['product_strength_grade', 'Product Strength/Grade'],
    ['batch_lot_number', 'Batch/Lot Number'],
    ['manufacturing_date', 'Manufacturing Date'],
    ['expiry_date', 'Expiry Date'],
    ['quantity_affected', 'Quantity Affected'],
  ] },
  { title: '3. Complaint Details', fields: [
    ['complaint_type', 'Complaint Type'],
    ['complaint_date', 'Complaint Date'],
    ['detailed_description', 'Detailed Complaint Description', true],
  ] },
  { title: '4. Initial Assessment & Priority', fields: [
    ['initial_severity', 'Initial Severity'],
    ['priority', 'Priority'],
  ] },
]

// Left panel: a READ-ONLY view of the complaint form. It reads straight from Redux,
// so it auto-updates whenever the copilot changes the form. No inputs to type into.
export default function ComplaintForm() {
  const form = useSelector((s) => s.complaint.form)
  const dispatch = useDispatch()
  const [saveMsg, setSaveMsg] = useState('')
  const [confirming, setConfirming] = useState(false)

  const isEmpty = Object.keys(form).length === 0

  // Whenever the complaint changes, drop any stale duplicate warning so the next
  // Save re-checks against the current form.
  useEffect(() => {
    setConfirming(false)
    dispatch(clearDuplicates())
  }, [form, dispatch])

  async function persist() {
    setSaveMsg('Saving…')
    try {
      const saved = await saveComplaint(form)
      setSaveMsg(`Saved as complaint #${saved.id} (status: ${saved.status}).`)
      setConfirming(false)
      dispatch(clearDuplicates())
    } catch {
      setSaveMsg('Save failed — is the backend running?')
    }
  }

  async function handleSave() {
    // Second click ("Save anyway") after a warning: just save.
    if (confirming) return persist()
    // First click: check for duplicates. Warn (but never block) if any are found.
    setSaveMsg('Checking for duplicates…')
    try {
      const { duplicates } = await checkDuplicate(form)
      if (duplicates.length > 0) {
        dispatch(setDuplicates(duplicates))
        setConfirming(true)
        setSaveMsg('Potential duplicate found — review below, then Save anyway to confirm.')
        return
      }
    } catch {
      // If the check fails, don't block saving — fall through to persist.
    }
    persist()
  }

  return (
    <section className="panel form-panel">
      <div className="panel-head">
        <div>
          <h2>Log Customer Complaint</h2>
          <span className="subtle">API &amp; FDF Quality Assurance Module</span>
        </div>
        <span className="badge badge-pending">Pending Triage</span>
      </div>

      {SECTIONS.map((section) => (
        <div className="form-section" key={section.title}>
          <div className="section-title">{section.title}</div>
          <div className="fields-grid">
            {section.fields.map(([key, label, full]) => (
              <div className={full ? 'field field-full' : 'field'} key={key}>
                <label>{label}</label>
                <div className={form[key] ? 'field-value' : 'field-value placeholder'}>
                  {form[key] || 'Awaiting AI extraction…'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="form-actions">
        <button
          className="btn ghost"
          onClick={() => { dispatch(resetComplaint()); setSaveMsg(''); setConfirming(false) }}
        >
          Reset Form
        </button>
        <button className="btn primary" onClick={handleSave} disabled={isEmpty}>
          {confirming ? 'Save anyway' : 'Save Complaint'}
        </button>
      </div>
      {saveMsg && <div className="save-msg">{saveMsg}</div>}
      <DuplicateCard />
    </section>
  )
}
