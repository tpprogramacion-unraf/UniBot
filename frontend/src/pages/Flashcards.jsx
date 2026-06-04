import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

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
    const color = en?.subject_color || '#007AFF'
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
        .fc-page * { box-sizing: border-box; }

        .fc-title {
          font-size: 1.6rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0;
          line-height: 1.15;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .fc-title em { font-style: normal; }
        .fc-subtitle { font-size: 0.78rem; color: var(--text-2); margin: 0.35rem 0 0; font-weight: 400; }

        .fc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }

        .fc-filter { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--text-2); font-weight: 500; }
        .fc-filter select {
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.4rem 0.8rem;
          outline: none;
          cursor: pointer;
          border-radius: var(--radius-xs);
        }

        .fc-folder-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        .fc-folder-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; position: relative; z-index: 1; }

        .fc-btn-read {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.5rem 1.2rem;
          background: var(--accent-gradient);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: var(--radius-xs);
          box-shadow: var(--glow-accent);
        }
        .fc-btn-read:hover { transform: translateY(-1px); filter: brightness(1.1); }

        .fc-btn-del {
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          padding: 0.5rem 0.8rem;
          background: transparent;
          color: var(--text-2);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.15s;
          border-radius: var(--radius-xs);
        }
        .fc-btn-del:hover { color: var(--red); border-color: var(--red); background: rgba(255, 69, 58, 0.08); }

        .fc-mini-strip {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 4px 0;
          scrollbar-width: thin;
          scrollbar-color: var(--accent) transparent;
          position: relative;
          z-index: 1;
        }

        .fc-mini-card {
          flex-shrink: 0;
          width: 110px;
          height: 72px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.4);
          border-radius: var(--radius-xs);
          padding: 0.5rem 0.6rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s;
          position: relative;
        }
        .fc-mini-card:hover {
          border-color: var(--accent);
          background: var(--accent-dim);
          transform: translateY(-2px);
        }
        /* Liquid Glass Border Distortion */
        .fc-mini-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px; /* Grosor del borde de distorsión */
          backdrop-filter: blur(40px) brightness(1.5) saturate(200%);
          -webkit-backdrop-filter: blur(40px) brightness(1.5) saturate(200%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 10;
        }

        .fc-mini-q { font-size: 0.6rem; line-height: 1.35; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
        .fc-mini-idx { font-size: 0.6rem; color: var(--accent); font-weight: 700; align-self: flex-end; }

        .fc-empty {
          padding: 3rem 2rem;
          text-align: center;
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: var(--glass-border);
          border-radius: var(--radius);
        }
        .fc-empty-icon { font-size: 2rem; display: block; margin-bottom: 1rem; color: var(--accent); }
        .fc-empty p { font-size: 0.85rem; color: var(--text-2); margin: 0; font-weight: 500; }
        .fc-empty small { font-size: 0.72rem; color: var(--text-3); display: block; margin-top: 0.4rem; }

        /* ── READER ── */
        .fc-reader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.15); /* Muy suave para no opacar el fondo */
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .fc-reader {
          width: 100%;
          max-width: 560px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(60px) saturate(250%);
          -webkit-backdrop-filter: blur(60px) saturate(250%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        /* Liquid Glass Border Distortion for Reader */
        .fc-reader::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          backdrop-filter: blur(60px) brightness(1.3) saturate(200%);
          -webkit-backdrop-filter: blur(60px) brightness(1.3) saturate(200%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 10;
        }

        .fc-reader-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid var(--border);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          position: relative;
          z-index: 1;
        }
        .fc-reader-subject { font-size: 0.75rem; font-weight: 600; color: var(--accent); }
        .fc-reader-counter { font-size: 0.72rem; color: var(--text-3); font-weight: 500; }
        .fc-reader-close {
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          line-height: 1;
          transition: color 0.15s;
          border-radius: var(--radius-xs);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fc-reader-close:hover { color: var(--text); background: var(--glass-bg-strong); }

        .fc-reader-progress { height: 3px; background: var(--border); position: relative; z-index: 1; }
        .fc-reader-progress-fill { height: 100%; background: var(--accent-gradient); transition: width 0.3s ease; border-radius: 999px; }

        .fc-reader-question {
          padding: 2.5rem 2rem 2rem;
          min-height: 220px;
          cursor: pointer;
          position: relative;
          user-select: none;
          z-index: 1;
        }
        .fc-reader-label { font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 1.2rem; }
        .fc-reader-text { font-size: 1rem; line-height: 1.75; color: var(--text); margin: 0; }
        .fc-reader-hint { position: absolute; bottom: 1rem; right: 1.25rem; font-size: 0.65rem; color: var(--text-3); font-weight: 500; }

        .fc-reader-sep { margin: 0 1.5rem; height: 1px; background: var(--border); position: relative; z-index: 1; }
        .fc-reader-sep::before {
          content: 'RESPUESTA';
          position: absolute;
          top: -0.45rem;
          left: 0;
          font-size: 0.62rem;
          letter-spacing: 0.06em;
          color: var(--text-3);
          background: var(--glass-bg);
          padding-right: 0.5rem;
          font-weight: 600;
        }

        .fc-reader-answer { padding: 1.5rem 2rem 2rem; animation: fc-in 0.2s ease; position: relative; z-index: 1; }
        .fc-reader-answer p { font-size: 0.9rem; line-height: 1.8; color: var(--text-2); margin: 0; }
        @keyframes fc-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        .fc-reader-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1.25rem;
          border-top: 1px solid var(--border);
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }
        .fc-nav-btn {
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          background: var(--glass-bg);
          color: var(--text-2);
          cursor: pointer;
          transition: all 0.15s;
          border-radius: var(--radius-xs);
        }
        .fc-nav-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .fc-nav-btn:disabled { opacity: 0.2; cursor: default; }

        .fc-nav-dots { display: flex; gap: 6px; align-items: center; }
        .fc-nav-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong); transition: all 0.2s; }
        .fc-nav-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
      `}</style>

      <div className="fc-page page">

        <div className="fc-header">
          <div>
            <h1 className="fc-title">Flash<em>cards</em></h1>
            <p className="fc-subtitle">{flashcards?.length ?? 0} tarjetas · {Object.keys(grouped).length} carpetas</p>
          </div>
          <div className="fc-filter">
            <span>Materia:</span>
            <select value={enrollment} onChange={e => setEnrollment(e.target.value)}>
              <option value="">Todas</option>
              {enrollments?.map(en => (
                <option key={en.id} value={en.id}>{en.subject_name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Cargando...</p>
        )}

        {!isLoading && Object.keys(grouped).length === 0 && (
          <div className="fc-empty">
            <span className="fc-empty-icon">◇</span>
            <p>No hay flashcards</p>
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
                    <span className="fc-folder-count">{cards.length} cards</span>
                  </div>
                </div>
                <div className="fc-folder-actions">
                  <button className="fc-btn-del" onClick={() => confirmDeleteFolder(subject, cards)} disabled={deleteFolder.isPending}>
                    Eliminar
                  </button>
                  <button className="fc-btn-read" onClick={() => openReader(cards, subject, 0)}>
                    ▶ Leer
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
              <button className="fc-reader-close" onClick={closeReader}>✕</button>
            </div>

            <div className="fc-reader-progress">
              <div className="fc-reader-progress-fill" style={{ width: `${((reader.idx + 1) / reader.cards.length) * 100}%` }} />
            </div>

            <div className="fc-reader-question" onClick={() => setFlipped(f => !f)}>
              <div className="fc-reader-label">Pregunta</div>
              <p className="fc-reader-text">{currentCard.question}</p>
              {!flipped && <span className="fc-reader-hint">Click para ver respuesta</span>}
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
                ← Anterior
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
                Siguiente →
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
