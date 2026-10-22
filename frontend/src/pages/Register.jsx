import { useEffect } from "react"
import Login from "./Login.jsx"
import { useAuthModal } from "../context/AuthModal.jsx"

// /register now shows the login page with the sign-up popup on top.
export default function Register() {
  const { openRegister } = useAuthModal()
  useEffect(() => { openRegister() }, [openRegister])
  return <Login />
}
