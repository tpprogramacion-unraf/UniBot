import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

const INITIAL_MSG = { role: 'assistant', content: '¡Hola! Soy UniBot ✨ Tu asistente académico. Puedo ayudarte a organizar tu estudio, analizar tus apuntes y prepararte para los exámenes. ¿Por dónde empezamos?' }
const SESSION_KEY = 'unibot_session_id'

export default function Chat() {
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || null)
  const [sessions, setSessions] = useState([])
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId)
      loadSessionDetail(sessionId)
    } else {
      localStorage.removeItem(SESSION_KEY)
      setMessages([INITIAL_MSG])
    }
  }, [sessionId])

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/agent/sessions/')
      setSessions(data)
    } catch (err) {
      console.error('Error fetching sessions', err)
    }
  }

  const loadSessionDetail = async (id) => {
    try {
      const { data } = await api.get(`/agent/${id}/session_detail/`)
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages)
      } else {
        setMessages([INITIAL_MSG])
      }
    } catch (err) {
      console.error('Error loading session detail', err)
      setMessages([INITIAL_MSG])
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const { data } = await api.post('/agent/chat/', {
        message: userMsg,
        session_id: sessionId
      })
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id)
        fetchSessions() // update sidebar with new session title
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

      if (data.study_plan_created) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '📅 El plan de estudio fue agregado al calendario. Podés verlo en la sección Calendario.',
          isSystem: true
        }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al conectar con el agente. Verificá que el servicio esté corriendo.' }])
    } finally {
      setLoading(false)
    }
  }

  const newSession = () => {
    setSessionId(null)
  }

  const suggestions = [
    '¿Qué exámenes tengo próximamente?',
    'Generá un plan de estudio para mi próximo parcial',
    '¿Cuáles son mis materias activas?',
    'Mostrá mis documentos cargados',
  ]

  return (
    <div className="page chat-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>UniBot AI</h1>
          <p className="subtitle">Tu asistente académico inteligente</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        <div className="chat-sidebar" style={{ width: '260px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
          <button type="button" className="btn-primary" onClick={newSession} style={{ width: '100%', marginBottom: '20px' }}>+ Nueva sesión</button>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>Historial</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => setSessionId(s.id)}
                style={{ 
                  padding: '12px 16px', 
                  cursor: 'pointer', 
                  borderRadius: '8px', 
                  background: sessionId === s.id ? 'var(--accent-light)' : 'var(--bg-2)',
                  border: sessionId === s.id ? '1px solid var(--accent)' : '1px solid transparent',
                  color: sessionId === s.id ? 'var(--accent)' : 'var(--text)',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {s.title || 'Nueva conversación'}
              </div>
            ))}
            {sessions.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay sesiones anteriores.</p>}
          </div>
        </div>

        <div className="chat-container" style={{ flex: 1, margin: 0, height: '100%' }}>
          <div className="messages" style={{ flex: 1, overflowY: 'auto' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`message message-${msg.role}`}>
                {msg.role === 'assistant' && <div className="bot-avatar">✨</div>}
                <div className={`message-bubble ${msg.isSystem ? 'system-msg' : ''}`}>
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message message-assistant">
                <div className="bot-avatar">✨</div>
                <div className="message-bubble typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button key={i} type="button" className="suggestion-chip" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className="chat-input-bar">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Preguntale algo a UniBot..."
              disabled={loading}
            />
            <button type="button" className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>▶</button>
          </div>
        </div>
      </div>
    </div>
  )
}
