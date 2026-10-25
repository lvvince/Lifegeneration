import { createContext, useCallback, useContext, useMemo } from "react"
import { useNavigate } from "react-router-dom"

/* Dating popup ang sign-up. Ngayon ay may sarili na itong page (/register),
   pero ang openRegister() ay gumagana pa rin kahit saan galing. */
const AuthModalContext = createContext({ openRegister: () => {}, closeRegister: () => {} })

export function AuthModalProvider({ children }) {
  const navigate = useNavigate()
  const openRegister = useCallback(() => navigate("/register"), [navigate])
  const closeRegister = useCallback(() => navigate("/login"), [navigate])
  const value = useMemo(() => ({ openRegister, closeRegister }), [openRegister, closeRegister])
  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>
}

export const useAuthModal = () => useContext(AuthModalContext)
