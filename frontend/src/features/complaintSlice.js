import { createSlice } from '@reduxjs/toolkit'

// One slice for the complaint state: the form fields and the AI risk assessment.
// The form is READ-ONLY in the UI — it only ever changes here, from the copilot's
// response. That is the whole point of the demo: the user never types into the form.
const initialState = {
  form: {},   // the 13 complaint fields, keyed by name
  risk: {},   // { severity, priority, rationale } — separate from the form
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    // Called after every copilot turn. The backend already merged the patch, so we
    // simply replace the form with the authoritative version it returned.
    applyChatResult: (state, action) => {
      state.form = action.payload.form
      state.risk = action.payload.risk || {}
    },
    resetComplaint: () => initialState,
  },
})

export const { applyChatResult, resetComplaint } = complaintSlice.actions
export default complaintSlice.reducer
