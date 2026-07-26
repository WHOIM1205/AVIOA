import ComplaintForm from './components/ComplaintForm'
import Copilot from './components/Copilot'

// App.jsx — the layout. Two panels: the read-only form on the left, the copilot on
// the right. Deliberately flat: no router, no nested layout components to explain.
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AI-Powered Customer Complaint Management</h1>
        <p>Pharmaceutical QMS · API &amp; FDF</p>
      </header>
      <div className="panels">
        <ComplaintForm />
        <Copilot />
      </div>
    </div>
  )
}
