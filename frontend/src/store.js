import { configureStore } from '@reduxjs/toolkit'
import complaintReducer from './features/complaintSlice'
import chatReducer from './features/chatSlice'

// The Redux store is the single source of truth. Two slices, exactly as the
// assignment scope needs: one for the complaint, one for the chat.
export const store = configureStore({
  reducer: {
    complaint: complaintReducer,
    chat: chatReducer,
  },
})
