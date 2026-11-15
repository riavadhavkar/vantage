// Toasts: short, polite status messages. The provider lives in Toaster.jsx.
import { createContext, useContext } from 'react'

export const ToastContext = createContext({ push: () => {}, dismiss: () => {} })

/** @returns {{ push: (text: string, opts?: { id?: string, isSticky?: boolean }) => void, dismiss: (id: string) => void }} push with isSticky stays until dismissed */
export default function useToast() {
  return useContext(ToastContext)
}
