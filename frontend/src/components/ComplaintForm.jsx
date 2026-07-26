import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { resetComplaint } from '../features/complaintSlice'
import { saveComplaint } from '../api'

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

  const isEmpty = Object.keys(form).length === 0

  async function handleSave() {
    setSaveMsg('Saving…')
    try {
      const saved = await saveComplaint(form)
      setSaveMsg(`Saved as complaint #${saved.id} (status: ${saved.status}).`)
    } catch {
      setSaveMsg('Save failed — is the backend running?')
    }
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
          onClick={() => { dispatch(resetComplaint()); setSaveMsg('') }}
        >
          Reset Form
        </button>
        <button className="btn primary" onClick={handleSave} disabled={isEmpty}>
          Save Complaint
        </button>
      </div>
      {saveMsg && <div className="save-msg">{saveMsg}</div>}
    </section>
  )
}
