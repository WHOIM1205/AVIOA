import { useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { applyChatResult } from '../features/complaintSlice'
import { addMessage, setLoading } from '../features/chatSlice'
import { sendChat, uploadDocument } from '../api'

// Colour the severity/priority badge by level.
const LEVEL_CLASS = {
  Low: 'sev-low', Medium: 'sev-medium', High: 'sev-high',
  Critical: 'sev-critical', Urgent: 'sev-critical',
}

// Right panel: the AI Copilot. Upload, chat, risk assessment, and the send button.
export default function Copilot() {
  const form = useSelector((s) => s.complaint.form)
  const risk = useSelector((s) => s.complaint.risk)
  const { messages, loading } = useSelector((s) => s.chat)
  const dispatch = useDispatch()
  const [input, setInput] = useState('')
  const fileRef = useRef(null)

  // One place that runs a turn: record the user message, call the backend, then push
  // the result into Redux (form + risk) and show the assistant's reply.
  async function runTurn(work, userText) {
    dispatch(addMessage({ role: 'user', text: userText }))
    dispatch(setLoading(true))
    try {
      const data = await work
      dispatch(applyChatResult({ form: data.form, risk: data.risk }))
      dispatch(addMessage({ role: 'assistant', text: data.reply }))
    } catch (e) {
      dispatch(addMessage({ role: 'assistant', text: 'Error: ' + e.message }))
    } finally {
      dispatch(setLoading(false))
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    runTurn(sendChat(text, form), text)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    runTurn(uploadDocument(file, form), `📎 Uploaded ${file.name}`)
    e.target.value = '' // let the user re-upload the same file if needed
  }

  const hasRisk = risk && risk.severity

  return (
    <section className="panel copilot-panel">
      <div className="panel-head">
        <h2>✦ AI Complaint Intake Assistant</h2>
        <span className="badge badge-beta">BETA</span>
      </div>

      <button className="upload-btn" onClick={() => fileRef.current.click()}>
        ⬆ Upload complaint document (PDF, TXT, EML)
      </button>
      <input
        ref={fileRef} type="file" accept=".pdf,.txt,.eml" hidden onChange={handleFile}
      />

      {hasRisk && (
        <div className="risk-box">
          <div className="risk-title">AI Copilot Risk Assessment</div>
          <div className="risk-badges">
            <span className={'badge ' + (LEVEL_CLASS[risk.severity] || '')}>
              Severity: {risk.severity}
            </span>
            <span className={'badge ' + (LEVEL_CLASS[risk.priority] || '')}>
              Priority: {risk.priority}
            </span>
          </div>
          <p className="risk-rationale">{risk.rationale}</p>
        </div>
      )}

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="msg assistant">
            Upload a complaint document or paste complaint text below. I&apos;ll extract the
            details, fill the form on the left, and assess the risk. You can also refine any
            field — e.g. &quot;batch is BMX24602, quantity 48 capsules&quot;.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={'msg ' + m.role}>{m.text}</div>
        ))}
        {loading && <div className="msg assistant">Analyzing…</div>}
      </div>

      <div className="chat-input">
        <textarea
          rows={2}
          placeholder="Paste a complaint, or type an edit and press Enter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
        />
        <button className="btn primary" onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
      <div className="disclaimer">AI responses may contain errors. Please verify information.</div>
    </section>
  )
}
