import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: events } = useQuery({ queryKey: ['upcoming-events'], queryFn: () => api.get('/events/upcoming/').then(r => r.data) })
  const { data: enrollments } = useQuery({ queryKey: ['enrollments'], queryFn: () => api.get('/enrollments/').then(r => r.data) })
  const { data: flashcards } = useQuery({ queryKey: ['flashcards'], queryFn: () => api.get('/flashcards/').then(r => r.data) })

  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Hola, {user?.username} · {dateStr}</p>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
          <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {timeStr}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap blue">📚</div>
          <div className="stat-info">
            <span className="stat-number">{String(enrollments?.length ?? 0).padStart(2, '0')}</span>
            <span className="stat-label">Materias</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap purple">📅</div>
          <div className="stat-info">
            <span className="stat-number">{String(events?.length ?? 0).padStart(2, '0')}</span>
            <span className="stat-label">Eventos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap green">⚡</div>
          <div className="stat-info">
            <span className="stat-number">{String(flashcards?.length ?? 0).padStart(2, '00')}</span>
            <span className="stat-label">Flashcards</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <h3>Próximos Eventos</h3>
          {events?.length === 0 && <p className="empty">No hay eventos próximos</p>}
          <div className="event-list">
            {events?.slice(0, 5).map(ev => (
              <div key={ev.id} className="event-item">
                <div className="event-dot" style={{ background: ev.subject_color || 'var(--accent)' }} />
                <div className="event-info">
                  <span className="event-title">{ev.title}</span>
                  <span className="event-sub">{ev.subject_name}</span>
                </div>
                <div className={`event-days ${ev.days_until <= 3 ? 'urgent' : ''}`}>
                  {ev.days_until === 0 ? 'Hoy' : ev.days_until < 0 ? 'Pasado' : `${ev.days_until} días`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <h3>Materias Activas</h3>
          {enrollments?.length === 0 && <p className="empty">No hay materias anotadas</p>}
          <div className="subject-list">
            {enrollments?.map(en => (
              <div key={en.id} className="subject-item">
                <div className="subject-color" style={{ background: en.subject_color }} />
                <div className="subject-info">
                  <span className="subject-name">{en.subject_name}</span>
                  <span className="subject-code">{en.subject_code || 'N/A'}</span>
                </div>
                <span className={`subject-status status-${en.status}`}>{en.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}