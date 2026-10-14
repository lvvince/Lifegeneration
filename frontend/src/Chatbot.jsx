import { useState, useRef, useEffect } from 'react'
import { askChatbot } from './api'

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! 👋 I'm the LGY assistant. Ask me anything about schedules, location, prayer, or ministry!" }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return

    setMessages(m => [...m, { from: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const { ok, data } = await askChatbot(q)
      const reply = ok && data.matched
        ? data.answer
        : (data.answer || "Sorry, I don't have an answer for that yet.")
      setMessages(m => [...m, { from: 'bot', text: reply }])
    } catch {
      setMessages(m => [...m, { from: 'bot', text: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chatbot-wrap">
      <div className="chatbot-header">
        <span>💬 LGY Chatbot</span>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg msg-${msg.from}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="msg msg-bot typing">Typing…</div>}
        <div ref={bottomRef} />
      </div>

      <form className="chatbot-input" onSubmit={send}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
    </div>
  )
}
