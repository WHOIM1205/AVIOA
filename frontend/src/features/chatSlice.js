import { createSlice } from '@reduxjs/toolkit'

// One slice for the chat state: the message log and a loading flag.
// (The text being typed lives as local component state — it doesn't need to be global.)
const initialState = {
  messages: [],   // [{ role: 'user' | 'assistant', text: string }]
  loading: false, // true while we wait for the backend
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
  },
})

export const { addMessage, setLoading } = chatSlice.actions
export default chatSlice.reducer
