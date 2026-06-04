import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

const DIFFICULTIES = [
  { key: 'easy', label: 'Fácil', desc: 'Conceptos fundamentales', color: '#30D158' },
  { key: 'medium', label: 'Media', desc: 'Aplicación combinada', color: '#FFD60A' },
  { key: 'hard', label: 'Difícil', desc: 'Síntesis y análisis crítico', color: '#FF453A' },
];

const EXAM_TYPES = [
  { key: 'theory', label: 'Teoría', desc: 'Definiciones, demostraciones, conceptos', icon: '📖' },
  { key: 'practice', label: 'Práctica', desc: 'Problemas numéricos, ejercicios, cálculos', icon: '🧮' },
  { key: 'mixed', label: 'Mixto', desc: 'Combinación de teoría y práctica', icon: '⚡' },
];

export default function ExamSimulator() {
  const qc = useQueryClient();
  const [enrollment, setEnrollment] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [examType, setExamType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api.get('/enrollments/').then((r) => r.data),
  });

  const { data: docs } = useQuery({
    queryKey: ['documents', enrollment],
    queryFn: () => api.get('/documents/').then((r) => r.data),
    enabled: !!enrollment,
  });

  const { data: history } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams/').then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: (payload) => api.post('/exams/generate/', payload),
    onSuccess: (res) => {
      setActiveExam(res.data);
      setAnswers({});
      setResult(null);
      setError('');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Error al generar el examen');
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, answers }) => api.post(`/exams/${id}/submit/`, { answers }),
    onSuccess: (res) => {
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  const toggleDoc = useCallback((id) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }, []);

  const handleGenerate = () => {
    if (!enrollment) { setError('Seleccioná una materia'); return; }
    if (selectedDocs.length === 0) { setError('Seleccioná al menos un PDF'); return; }
    setError('');
    generateMutation.mutate({
      document_ids: selectedDocs,
      difficulty,
      exam_type: examType,
      count: questionCount,
    });
  };

  const handleAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = () => {
    if (!activeExam) return;
    submitMutation.mutate({ id: activeExam.exam_id, answers });
  };

  const reset = () => {
    setActiveExam(null);
    setResult(null);
    setAnswers({});
    setSelectedDocs([]);
  };

  if (result) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Resultados</h1>
          <p className="subtitle">{activeExam?.title}</p>
        </div>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid var(--border-glass)', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: result.score >= 7 ? 'var(--green)' : result.score >= 4 ? 'var(--amber)' : 'var(--red)', letterSpacing: '-0.03em' }}>
            {result.score !== null ? `${result.score}/10` : 'Pendiente de corrección'}
          </div>
          <p style={{ color: 'var(--text-2)', marginTop: '0.5rem' }}>
            Correctas: {result.correct_count} / {result.total}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.results.map((r) => (
            <div key={r.id} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: `4px solid ${r.is_correct === true ? 'var(--green)' : r.is_correct === false ? 'var(--red)' : 'var(--amber)'}`, border: '1px solid var(--border-glass)' }}>
              <strong>Pregunta #{r.id}</strong>
              <div style={{ marginTop: 6, color: 'var(--text-2)', fontSize: '0.88rem' }}>
                Tu respuesta: <code style={{ background: 'var(--glass-bg-strong)', padding: '2px 6px', borderRadius: '4px' }}>{String(r.your_answer)}</code> · Correcta: <code style={{ background: 'var(--glass-bg-strong)', padding: '2px 6px', borderRadius: '4px' }}>{String(r.correct_answer)}</code>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-3)' }}>{r.explanation}</div>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ marginTop: 24 }} onClick={reset}>
          Generar nuevo examen
        </button>
      </div>
    );
  }

  if (activeExam) {
    const typeLabel = EXAM_TYPES.find(t => t.key === activeExam.exam_type)?.label || 'Mixto';
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{activeExam.title}</h1>
            <p className="subtitle">
              {typeLabel} · Dificultad: {activeExam.difficulty} · Tiempo: {activeExam.estimated_time} min · {activeExam.question_count} preguntas
            </p>
          </div>
        </div>
        {activeExam.instructions && (
          <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.88rem', color: 'var(--text-2)', border: '1px solid var(--border-glass)' }}>
            <strong>Instrucciones:</strong> {activeExam.instructions}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeExam.questions.map((q, idx) => (
            <div key={q.id} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                {idx + 1}. [{q.type === 'multiple_choice' ? 'Opción múltiple' : q.type === 'true_false' ? 'Verdadero/Falso' : 'Desarrollo'}] {q.text}
              </div>

              {q.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt) => (
                    <label key={opt} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-xs)', background: answers[q.id] === opt.charAt(0) ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${answers[q.id] === opt.charAt(0) ? 'var(--accent)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.charAt(0)}
                        checked={answers[q.id] === opt.charAt(0)}
                        onChange={() => handleAnswer(q.id, opt.charAt(0))}
                      />
                      <span style={{ fontSize: '0.88rem' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { val: true, label: 'Verdadero' },
                    { val: false, label: 'Falso' },
                  ].map((opt) => (
                    <label key={String(opt.val)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 'var(--radius-xs)', background: answers[q.id] === opt.val ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${answers[q.id] === opt.val ? 'var(--accent)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === opt.val}
                        onChange={() => handleAnswer(q.id, opt.val)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'open' && (
                <textarea
                  rows={4}
                  placeholder="Escribí tu respuesta aquí..."
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', resize: 'vertical', fontFamily: 'Inter, sans-serif', outline: 'none' }}
                />
              )}

              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-3)' }}>Tema: {q.topic}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Corrigiendo...' : 'Entregar examen'}
          </button>
          <button type="button" className="btn-secondary" onClick={reset}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Simulador de Parciales</h1>
          <p className="subtitle">Generá exámenes originales con IA basados en tus apuntes</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', marginBottom: '1rem', background: 'rgba(255, 69, 58, 0.08)', color: 'var(--red)', fontSize: '0.88rem', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
          {error}
        </div>
      )}

      <div className="brain-drain-grid">
        <div className="upload-section">
          <div className="field">
            <label htmlFor="exam-enrollment">Materia</label>
            <select id="exam-enrollment" value={enrollment} onChange={(e) => { setEnrollment(e.target.value); setSelectedDocs([]); }}>
              <option value="">Seleccionar materia...</option>
              {enrollments?.map((en) => (
                <option key={en.id} value={en.id}>{en.subject_name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tipo de examen</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {EXAM_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setExamType(t.key)}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${examType === t.key ? 'var(--accent)' : 'var(--border)'}`,
                    background: examType === t.key ? 'var(--accent-dim)' : 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    color: examType === t.key ? 'var(--accent)' : 'var(--text-2)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{t.icon}</div>
                  <div>{t.label}</div>
                  <small style={{ fontWeight: 400, opacity: 0.7, fontSize: '0.72rem' }}>{t.desc}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Dificultad</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDifficulty(d.key)}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${difficulty === d.key ? d.color : 'var(--border)'}`,
                    background: difficulty === d.key ? `${d.color}15` : 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    color: difficulty === d.key ? d.color : 'var(--text-2)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>{d.label}</div>
                  <small style={{ fontWeight: 400, opacity: 0.7, fontSize: '0.72rem' }}>{d.desc}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="q-count">Cantidad de preguntas: {questionCount}</label>
            <input
              id="q-count"
              type="range"
              min={3}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <button
            className="btn-primary"
            style={{ marginTop: 8, width: '100%' }}
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !enrollment || selectedDocs.length === 0}
          >
            {generateMutation.isPending ? 'Generando examen con IA...' : '✨ Generar parcial de prueba'}
          </button>
        </div>

        <div className="docs-section">
          <h3>Documentos disponibles {enrollment ? `(${docs?.length ?? 0})` : ''}</h3>
          {!enrollment && (
            <div className="empty-state">
              <span>📄</span>
              <p>Seleccioná una materia</p>
              <small>Para ver los PDFs indexados</small>
            </div>
          )}
          {enrollment && docs?.length === 0 && (
            <div className="empty-state">
              <span>📄</span>
              <p>No hay documentos indexados</p>
              <small>Subí PDFs en Brain Drain primero</small>
            </div>
          )}
          <div className="doc-list">
            {docs?.map((doc) => {
              const selected = selectedDocs.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: selected ? 'var(--accent-dim)' : 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <input type="checkbox" checked={selected} onChange={() => {}} style={{ pointerEvents: 'none', accentColor: 'var(--accent)' }} />
                  <div className="doc-icon" style={{ width: 32, height: 32, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PDF</div>
                  <div className="doc-info" style={{ flex: 1 }}>
                    <span className="doc-name" style={{ fontSize: '0.88rem' }}>{doc.filename}</span>
                    <span className="doc-meta">{(doc.file_size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  {selected && <span style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 700 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {history && history.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Historial de exámenes</h3>
          <div className="doc-list" style={{ marginTop: '0.75rem' }}>
            {history.map((ex) => (
              <div key={ex.id} className="doc-item" style={{ cursor: 'pointer' }} onClick={() => setActiveExam({ exam_id: ex.id, title: ex.title, questions: ex.questions, difficulty: 'medium', exam_type: 'mixed', question_count: ex.question_count, estimated_time: 60, instructions: '' })}>
                <div className="doc-icon">📝</div>
                <div className="doc-info">
                  <span className="doc-name">{ex.title}</span>
                  <span className="doc-meta">{ex.question_count} preguntas · {ex.score !== null ? `Nota: ${ex.score}/10` : 'Sin corregir'}</span>
                </div>
                <span className="doc-status" style={{ color: ex.score >= 7 ? 'var(--green)' : ex.score >= 4 ? 'var(--amber)' : 'var(--text-3)' }}>
                  {ex.score !== null ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}