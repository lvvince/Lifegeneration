import { createContext, useCallback, useContext, useMemo, useState } from "react"
import RegisterModal from "../components/RegisterModal.jsx"

const AuthModalContext = createContext({ openRegister: () => {}, closeRegister: () => {} })

export function AuthModalProvider({ children }) {
  const [registerOpen, setRegisterOpen] = useState(false)
  const openRegister = useCallback(() => setRegisterOpen(true), [])
  const closeRegister = useCallback(() => setRegisterOpen(false), [])
  const value = useMemo(() => ({ openRegister, closeRegister }), [openRegister, closeRegister])

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {registerOpen && <RegisterModal onClose={closeRegister} />}
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = () => useContext(AuthModalContext)
