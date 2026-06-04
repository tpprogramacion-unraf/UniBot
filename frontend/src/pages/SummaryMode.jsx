import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { FileText, Loader } from 'lucide-react'
import api from '../api/client'

export default function SummaryMode() {
  const queryClient = useQueryClient()
  const [selectedEnrollment, setSelectedEnrollment] = useState('')
  const [selectedDocs, setSelectedDocs] = useState([])
  const [summaryTitle, setSummaryTitle] = useState('Resumen para el próximo parcial')
  const [activeSummary, setActiveSummary] = useState(null)

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const res = await api.get('/enrollments/')
      return res.data
    }
  })

  // Fetch documents for selected enrollment
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', selectedEnrollment],
    queryFn: async () => {
      const res = await api.get('/documents/')
      return res.data.filter(d => d.enrollment === selectedEnrollment && d.status === 'indexed')
    },
    enabled: !!selectedEnrollment
  })

  // Fetch previous summaries for selected enrollment
  const { data: summaries = [], isLoading: loadingSummaries } = useQuery({
    queryKey: ['summaries', selectedEnrollment],
    queryFn: async () => {
      const res = await api.get('/summaries/')
      return res.data.filter(s => s.enrollment === selectedEnrollment)
    },
    enabled: !!selectedEnrollment
  })

  const generateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/summaries/generate/', payload)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['summaries', selectedEnrollment])
      setActiveSummary(data)
      setSelectedDocs([])
    }
  })

  const toggleDoc = (docId) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId))
    } else {
      setSelectedDocs([...selectedDocs, docId])
    }
  }

  const handleGenerate = () => {
    if (!selectedEnrollment || selectedDocs.length === 0) return
    generateMutation.mutate({
      enrollment_id: selectedEnrollment,
      document_ids: selectedDocs,
      title: summaryTitle
    })
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '1.5rem', height: '100%' }}>
      
      {/* Sidebar for setup */}
      <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Generar Resumen</h1>
        
        <div className="form-group">
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Materia</label>
          <select 
            value={selectedEnrollment}
            onChange={(e) => {
              setSelectedEnrollment(e.target.value)
              setSelectedDocs([])
              setActiveSummary(null)
            }}
            style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}
          >
            <option value="">Seleccioná una materia...</option>
            {enrollments.map(e => (
              <option key={e.id} value={e.id}>{e.subject_name}</option>
            ))}
          </select>
        </div>

        {selectedEnrollment && (
          <>
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Título del Resumen</label>
              <input 
                type="text" 
                value={summaryTitle}
                onChange={(e) => setSummaryTitle(e.target.value)}
                placeholder="Ej: Resumen Unidad 1"
                style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', color: 'var(--text)', fontFamily: 'Inter, sans-serif', outline: 'none' }}
              />
            </div>

            <div>
              <h3 style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Archivos para incluir</h3>
              {loadingDocs ? <p style={{ color: 'var(--text-3)' }}>Cargando documentos...</p> : documents.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay documentos indexados para esta materia.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {documents.map(doc => (
                    <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', background: selectedDocs.includes(doc.id) ? 'var(--accent-dim)' : 'var(--glass-bg)', border: `1px solid ${selectedDocs.includes(doc.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-xs)', cursor: 'pointer', transition: 'all 0.15s', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedDocs.includes(doc.id)} 
                        onChange={() => toggleDoc(doc.id)} 
                      />
                      <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button 
              className="btn-primary" 
              onClick={handleGenerate}
              disabled={selectedDocs.length === 0 || generateMutation.isPending}
              style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
            >
              {generateMutation.isPending ? <><Loader className="spin" size={18} style={{ marginRight: '8px', display: 'inline' }} /> Generando IA...</> : '✨ Crear Resumen'}
            </button>
          </>
        )}

        {selectedEnrollment && !loadingSummaries && summaries.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resúmenes anteriores</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {summaries.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setActiveSummary(s)}
                  style={{ textAlign: 'left', padding: '0.8rem', background: activeSummary?.id === s.id ? 'var(--accent-dim)' : 'var(--glass-bg)', border: `1px solid ${activeSummary?.id === s.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-xs)', cursor: 'pointer', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', transition: 'all 0.15s', color: 'var(--text)' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main viewer */}
      <div style={{ flex: '1', background: 'var(--glass-bg)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRadius: 'var(--radius)', border: '1px solid var(--border-glass)', padding: '2rem', overflowY: 'auto', boxShadow: 'var(--glass-shadow)' }}>
        {generateMutation.isPending ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-2)' }}>
            <Loader size={48} className="spin" style={{ marginBottom: '1rem', color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Leyendo tus documentos...</h2>
            <p style={{ color: 'var(--text-3)' }}>La IA de UniBot está redactando el mejor resumen para vos.</p>
          </div>
        ) : activeSummary ? (
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 700, letterSpacing: '-0.03em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{activeSummary.title}</h1>
            <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: 'var(--radius-xs)', marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
              <strong>Documentos analizados: </strong>
              {activeSummary.documents?.map(docId => {
                const d = documents.find(x => x.id === docId);
                return d ? d.filename : 'Archivo';
              }).join(', ')}
            </div>
            <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
              <ReactMarkdown>{activeSummary.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', textAlign: 'center' }}>
            <FileText size={64} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 500 }}>Seleccioná documentos y generá un resumen</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>El resumen aparecerá acá, listo para estudiar.</p>
          </div>
        )}
      </div>
      
    </div>
  )
}
