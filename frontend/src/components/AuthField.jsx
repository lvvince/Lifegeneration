import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import GlassIcon from "./GlassIcon.jsx"

/** Pill input with a glass icon. Placeholder doubles as the label. */
export default function AuthField({
  icon, tint, name, type = "text", placeholder, value, onChange,
  error, autoComplete, autoFocus, inputMode,
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === "password"

  return (
    <div className="auth-field-wrap">
      <label className="auth-field" style={{ margin: 0, padding: "0 8px" }}>
        <GlassIcon icon={icon} tint={tint} size={36} />
        <input
          name={name}
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShow(v => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </label>
      {error && <span className="auth-field-err">{error}</span>}
    </div>
  )
}
