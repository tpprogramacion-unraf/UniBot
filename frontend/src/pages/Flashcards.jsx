import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

const DOT_BG = `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`

export default function Flashcards() {
  const qc = useQueryClient()
  const [enrollment, setEnrollment] = useState('')
  const [reader, setReader] = useState(null)   // { cards, subject, idx }
  const [flipped, setFlipped] = useState(false)

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api.get('/enrollments/').then(r => r.data),
  })

  const { data: flashcards, isLoading } = useQuery({
    queryKey: ['flashcards', enrollment],
    queryFn: () => {
      const url = enrollment ? `/flashcards/?enrollment=${enrollment}` : '/flashcards/'
      return api.get(url).then(r => r.data?.results ?? r.data)
    },
  })

  const deleteFolder = useMutation({
    mutationFn: async (cards) => {
      await Promise.all(cards.map(fc => api.delete(`/flashcards/${fc.id}/`)))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  })

  const grouped = (flashcards || []).reduce((acc, fc) => {
    const en = enrollments?.find(e => e.id === fc.enrollment)
    const key = en ? en.subject_name : 'Sin materia'
    const color = en?.subject_color || '#ff0000'
    if (!acc[key]) acc[key] = { cards: [], color }
    acc[key].cards.push(fc)
    return acc
  }, {})

  const openReader = (cards, subject, startIdx = 0) => {
    setReader({ cards, subject, idx: startIdx })
    setFlipped(false)
  }

  const closeReader = () => setReader(null)

  const navigate = (dir) => {
    setFlipped(false)
    setReader(prev => ({
      ...prev,
      idx: Math.max(0, Math.min(prev.cards.length - 1, prev.idx + dir))
    }))
  }

  const confirmDeleteFolder = (subject, cards) => {
    if (!window.confirm(`¿Eliminar todas las flashcards de "${subject}"?`)) return
    deleteFolder.mutate(cards)
  }

  const currentCard = reader ? reader.cards[reader.idx] : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

        .fc-page { font-family: 'Space Mono', monospace; }
        .fc-page * { box-sizing: border-box; }

        .fc-title { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; margin: 0; line-height: 1.1; color: var(--text-1); }
        .fc-title em { color: #ff0000; font-style: normal; }
        .fc-subtitle { font-size: 0.7rem; color: var(--text-2); margin: 0.35rem 0 0; letter-spacing: 0.06em; text-transform: uppercase; }

        .fc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }

        .fc-filter { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--text-2); letter-spacing: 0.05em; }
        .fc-filter select { font-family: 'Space Mono', monospace; font-size: 0.7rem; background: transparent; border: 1px solid var(--border); color: var(--text-1); padding: 0.3rem 0.6rem; outline: none; cursor: pointer; border-radius: 0; }

        .fc-folders { display: flex; flex-direction: column; gap: 1px; border: 1px solid var(--border); background: var(--border); }

        .fc-folder { background: var(--surface); padding: 1.25rem 1.4rem; display: flex; flex-direction: column; gap: 1rem; }

        .fc-folder-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .fc-folder-left { display: flex; align-items: center; gap: 12px; }
        .fc-folder-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .fc-folder-name { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-1); }
        .fc-folder-count { font-size: 0.65rem; color: var(--text-2); letter-spacing: 0.08em; display: block; margin-top: 2px; }

        .fc-folder-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .fc-btn-read { font-family: 'Space Mono', monospace; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.45rem 1rem; background: #ff0000; color: #fff; border: none; cursor: pointer; transition: opacity 0.15s; }
        .fc-btn-read:hover { opacity: 0.82; }

        .fc-btn-del { font-family: 'Space Mono', monospace; font-size: 0.65rem; letter-spacing: 0.05em; padding: 0.45rem 0.7rem; background: transparent; color: var(--text-2); border: 1px solid var(--border); cursor: pointer; transition: color 0.15s, border-color 0.15s; }
        .fc-btn-del:hover { color: #ef4444; border-color: #ef4444; }

        .fc-mini-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; scrollbar-color: #ff0000 transparent; }

        .fc-mini-card { flex-shrink: 0; width: 110px; height: 72px; background: var(--bg); border: 1px solid var(--border); padding: 0.5rem 0.6rem; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; transition: border-color 0.15s; }
        .fc-mini-card:hover { border-color: #ff0000; }
        .fc-mini-q { font-size: 0.58rem; line-height: 1.35; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
        .fc-mini-idx { font-size: 0.55rem; color: #ff0000; font-weight: 700; letter-spacing: 0.06em; align-self: flex-end; }

        .fc-empty { padding: 3rem 2rem; text-align: center; border: 1px solid var(--border); }
        .fc-empty-icon { font-size: 1.5rem; display: block; margin-bottom: 1rem; color: #ff0000; }
        .fc-empty p { font-size: 0.78rem; color: var(--text-2); margin: 0; letter-spacing: 0.05em; }
        .fc-empty small { font-size: 0.65rem; color: #444; display: block; margin-top: 0.4rem; }

        /* ── READER ── */
        .fc-reader-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem; backdrop-filter: blur(6px); }

        .fc-reader { width: 100%; max-width: 540px; background: #0d0d0d; border: 1px solid #1f1f1f; display: flex; flex-direction: column; overflow: hidden; font-family: 'Space Mono', monospace; }

        .fc-reader-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.25rem; border-bottom: 1px solid #1a1a1a; background: #080808; }
        .fc-reader-subject { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #ff0000; }
        .fc-reader-counter { font-size: 0.65rem; color: #444; letter-spacing: 0.06em; }
        .fc-reader-close { background: transparent; border: none; color: #555; cursor: pointer; font-size: 0.9rem; font-family: 'Space Mono', monospace; padding: 0; line-height: 1; transition: color 0.15s; }
        .fc-reader-close:hover { color: #e8e8e8; }

        .fc-reader-progress { height: 2px; background: #1a1a1a; }
        .fc-reader-progress-fill { height: 100%; background: #ff0000; transition: width 0.3s ease; }

        .fc-reader-question { padding: 2.5rem 2rem 2rem; min-height: 220px; cursor: pointer; position: relative; user-select: none; background-image: ${DOT_BG}; background-size: 22px 22px; }
        .fc-reader-label { font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: #ff0000; font-weight: 700; margin-bottom: 1.2rem; }
        .fc-reader-text { font-size: 1rem; line-height: 1.75; color: #e0e0e0; margin: 0; }
        .fc-reader-hint { position: absolute; bottom: 1rem; right: 1.25rem; font-size: 0.58rem; color: #2a2a2a; letter-spacing: 0.06em; }

        .fc-reader-sep { margin: 0 1.5rem; height: 1px; background: #1a1a1a; position: relative; }
        .fc-reader-sep::before { content: '// RESPUESTA'; position: absolute; top: -0.45rem; left: 0; font-size: 0.56rem; letter-spacing: 0.1em; color: #333; background: #0d0d0d; padding-right: 0.5rem; font-family: 'Space Mono', monospace; }

        .fc-reader-answer { padding: 1.5rem 2rem 2rem; animation: fc-in 0.2s ease; }
        .fc-reader-answer p { font-size: 0.88rem; line-height: 1.8; color: #999; margin: 0; }
        @keyframes fc-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        .fc-reader-nav { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.25rem; border-top: 1px solid #1a1a1a; background: #080808; gap: 1rem; }
        .fc-nav-btn { font-family: 'Space Mono', monospace; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.5rem 1rem; border: 1px solid #222; background: transparent; color: #666; cursor: pointer; transition: all 0.15s; }
        .fc-nav-btn:hover:not(:disabled) { border-color: #ff0000; color: #ff0000; }
        .fc-nav-btn:disabled { opacity: 0.18; cursor: default; }

        .fc-nav-dots { display: flex; gap: 5px; align-items: center; }
        .fc-nav-dot { width: 5px; height: 5px; border-radius: 50%; background: #222; transition: background 0.15s; }
        .fc-nav-dot.active { background: #ff0000; }
      `}</style>

      <div className="fc-page page">

        <div className="fc-header">
          <div>
            <h1 className="fc-title">Flash<em>cards</em></h1>
            <p className="fc-subtitle">// {flashcards?.length ?? 0} tarjetas · {Object.keys(grouped).length} carpetas</p>
          </div>
          <div className="fc-filter">
            <span>MATERIA:</span>
            <select value={enrollment} onChange={e => setEnrollment(e.target.value)}>
              <option value="">TODAS</option>
              {enrollments?.map(en => (
                <option key={en.id} value={en.id}>{en.subject_name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <p style={{ fontSize: '0.72rem', color: '#444', letterSpacing: '0.1em', fontFamily: 'Space Mono, monospace' }}>// CARGANDO...</p>
        )}

        {!isLoading && Object.keys(grouped).length === 0 && (
          <div className="fc-empty">
            <span className="fc-empty-icon">◇</span>
            <p>NO HAY FLASHCARDS</p>
            <small>Generá desde Brain Drain → ⚡ Flashcards</small>
          </div>
        )}

        <div className="fc-folders">
          {Object.entries(grouped).map(([subject, { cards, color }]) => (
            <div key={subject} className="fc-folder">
              <div className="fc-folder-header">
                <div className="fc-folder-left">
                  <div className="fc-folder-dot" style={{ background: color }} />
                  <div>
                    <span className="fc-folder-name">{subject}</span>
                    <span className="fc-folder-count">{cards.length} CARDS</span>
                  </div>
                </div>
                <div className="fc-folder-actions">
                  <button className="fc-btn-del" onClick={() => confirmDeleteFolder(subject, cards)} disabled={deleteFolder.isPending}>
                    [DEL]
                  </button>
                  <button className="fc-btn-read" onClick={() => openReader(cards, subject, 0)}>
                    ▶ LEER
                  </button>
                </div>
              </div>

              <div className="fc-mini-strip">
                {cards.map((fc, i) => (
                  <div key={fc.id} className="fc-mini-card" onClick={() => openReader(cards, subject, i)} title={fc.question}>
                    <p className="fc-mini-q">{fc.question}</p>
                    <span className="fc-mini-idx">#{String(i + 1).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* READER MODAL */}
      {reader && currentCard && (
        <div className="fc-reader-overlay" onClick={closeReader}>
          <div className="fc-reader" onClick={e => e.stopPropagation()}>

            <div className="fc-reader-topbar">
              <span className="fc-reader-subject">{reader.subject}</span>
              <span className="fc-reader-counter">{String(reader.idx + 1).padStart(2, '0')} / {String(reader.cards.length).padStart(2, '0')}</span>
              <button className="fc-reader-close" onClick={closeReader}>[✕]</button>
            </div>

            <div className="fc-reader-progress">
              <div className="fc-reader-progress-fill" style={{ width: `${((reader.idx + 1) / reader.cards.length) * 100}%` }} />
            </div>

            <div className="fc-reader-question" onClick={() => setFlipped(f => !f)}>
              <div className="fc-reader-label">// PREGUNTA</div>
              <p className="fc-reader-text">{currentCard.question}</p>
              {!flipped && <span className="fc-reader-hint">[ CLICK PARA VER RESPUESTA ]</span>}
            </div>

            {flipped && (
              <>
                <div className="fc-reader-sep" />
                <div className="fc-reader-answer">
                  <p>{currentCard.answer}</p>
                </div>
              </>
            )}

            <div className="fc-reader-nav">
              <button className="fc-nav-btn" onClick={() => navigate(-1)} disabled={reader.idx === 0}>
                ← ANTERIOR
              </button>

              <div className="fc-nav-dots">
                {reader.cards
                  .slice(Math.max(0, reader.idx - 3), Math.min(reader.cards.length, reader.idx + 4))
                  .map((_, i) => {
                    const abs = Math.max(0, reader.idx - 3) + i
                    return <div key={abs} className={`fc-nav-dot${abs === reader.idx ? ' active' : ''}`} />
                  })}
              </div>

              <button className="fc-nav-btn" onClick={() => navigate(1)} disabled={reader.idx === reader.cards.length - 1}>
                SIGUIENTE →
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
