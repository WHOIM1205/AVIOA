import { createSlice } from '@reduxjs/toolkit'

// One slice for the complaint state: the form fields and the AI risk assessment.
// The form is READ-ONLY in the UI — it only ever changes here, from the copilot's
// response. That is the whole point of the demo: the user never types into the form.
const initialState = {
  form: {},          // the 13 complaint fields, keyed by name
  completeness: {},  // { fields: {name: bool}, score } — Bonus Feature 1
  risk: {},          // { severity, priority, rationale, confidence } — separate from the form
  summary: '',       // advisory summary — Bonus Feature 2
  rootCauses: [],    // advisory probable root causes — Bonus Feature 3
  capa: [],          // advisory recommended actions — Bonus Feature 4
  duplicates: [],    // potential duplicates found at save time — Bonus Feature 5
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    // Called after every copilot turn. The backend already merged the patch, so we
    // simply replace the form with the authoritative version it returned.
    applyChatResult: (state, action) => {
      state.form = action.payload.form
      state.completeness = action.payload.completeness || {}
      state.risk = action.payload.risk || {}
      // Advisory: only overwrite when it arrives non-null. When the advise node was
      // skipped (patch empty), these are null and we KEEP the previous cards.
      if (action.payload.summary != null) state.summary = action.payload.summary
      if (action.payload.root_causes != null) state.rootCauses = action.payload.root_causes
      if (action.payload.capa != null) state.capa = action.payload.capa
    },
    setDuplicates: (state, action) => {
      state.duplicates = action.payload
    },
    clearDuplicates: (state) => {
      state.duplicates = []
    },
    resetComplaint: () => initialState,
  },
})

export const { applyChatResult, setDuplicates, clearDuplicates, resetComplaint } =
  complaintSlice.actions
export default complaintSlice.reducer
