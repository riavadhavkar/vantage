// Toasts: short, polite status messages. The provider lives in components/Toaster.jsx.
import { createContext, useContext } from 'react'

export const ToastContext = createContext({ push: () => {} })

/** @returns {{ push: (text: string, opts?: { id?: string }) => void }} */
export default function useToast() {
  return useContext(ToastContext)
}
